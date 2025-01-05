const dotenv = require("dotenv");
dotenv.config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");

// ___________step 1___for jwt and cookies storage

var jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');


const app = express();
const PORT = process.env.PORT || 5000;



// Middleware
// ___________step 2___for jwt and cookies storage
app.use(cors(
  {
    origin: [
      "http://localhost:4173",
      "http://localhost:5173",
      "https://job-seeker-d51b4.web.app",
    
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],

    credentials: true
  }
));



app.use(express.json());

// ___________step 3___for jwt and cookies storage
app.use(cookieParser());


// ________________________middle ware

const logger = async( req, res, next)=>{
  console.log("Inside the logger");

  next();
}



// ___________step 5___for jwt and cookies storage

const verifyToken = async (req, res, next)=>{
  console.log("Inside verify token middleware");
  const token = req?.cookies?.token;
  console.log(token);
  if(!token){
    return res.status(401).send({message : "Unauthorized Access"});
  }


  // verify the token
  jwt.verify(token, process.env.JWT_SECRET, (error, decoded)=>{
      if(error){
        return res.status(401).send({message : "Unauthorized Access"});
      }else{
        // console.log("Okay");
        req.user = decoded;
      }
      next();
  })
  
}
  
  



// Database connection

const uri = process.env.MONGO_URI;

// const uri = "mongodb://localhost:27017"

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});



async function run() {
  try {
    // await client.connect();

    // await client.db("admin").command({ ping: 1 });
    // Access the database and collections

    const db = client.db("job_seeker");
    const userCollection = db.collection("user");
    const jobCollection = db.collection("job");
    const jobApplicationCollection = db.collection("jobApplications");
    const saveJobCollection = db.collection("savedJob");

    console.log("Successfully connected to MongoDB!");



    // auth related APIS


// ___________step 4___for jwt and cookies storage

    app.post("/jwt", async (req, res) => {
      const email = req.body.email; 
      const payload = { email }; // Create a payload object
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }); 
    
      res
      .cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        // secure: process.env.NODE_ENV === "production",
  
      })
      .send({ success: true}); 
    });



    app.post("/logout", async(req, res)=>{
       res.clearCookie("token",{
        httpOnly : true,
        // secure: process.env.NODE_ENV === "production",
  
       }).send({success: true});
    })





// ________________________________my posted job api 



    app.get("/jobs/:email", async (req, res) => {
      try {
        const email = req.params.email; 
        const result = await jobCollection.find({ addJobOwnerEmail: email }).toArray();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message }); // Proper error handling
      }
    });
    
    
    app.delete("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await jobCollection.deleteOne({ _id: new ObjectId(id) });
        if (!result) {
          return res.status(404).json({ message: "result not found" });
        }
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ message: "Error fetching result details" });
      }
    });




    app.put("/jobs/:id", async (req, res) => {
      const id = req.params.id; 
      console.log("Job ID: ", id);
      
      // Check if the provided ID is a valid ObjectId
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }
    
      const query = { _id: new ObjectId(id) }; 
      const data = req.body; 
      
      try {
      
        const result = await jobCollection.updateOne(query, { $set: data });
    
      
        if (result.modifiedCount === 0) {
          return res.status(404).json({ message: "Job not found or no changes made" });
        }
    
       
        res.status(200).json({ message: "Job updated successfully", result });
      } catch (error) {
        // Send error response if something goes wrong during the database operation
        console.error("Error updating job:", error); // Log the error for debugging
        res.status(500).json({ message: "Error updating job", error: error.message });
      }
    });



    app.get("/jobs", async (req, res) => {
      try {
        const result = await jobCollection.find().limit(6).toArray();
        res.json(result);
      } catch (error) {
        res.json(error);
      }
    });



    app.get("/allJob", async (req, res) => {
      try {
        const result = await jobCollection.find().toArray();
        res.json(result);
      } catch (error) {
        res.json(error);
      }
    });



    app.get("/jobDetails/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await jobCollection.findOne({ _id: new ObjectId(id) });
        if (!result) {
          return res.status(404).json({ message: "result not found" });
        }
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ message: "Error fetching result details" });
      }
    });





    app.patch("/jobApplication-view/:id", async (req, res) => {
      const id = req.params.id;
      const statusData = req.body.statusData.status;
      console.log(id, statusData)
    
      try {
   
        const result = await jobApplicationCollection.updateOne(
          { _id: new ObjectId(id) }, 
          {
            $set: { status: statusData }
          },
          { upsert: true } 
        );
    

        if (result.matchedCount === 0 && result.upsertedCount === 0) {
          return res.status(404).json({ message: "Job application not found, and no new document inserted." });
        }
    
        // console.log(result);
        res.status(200).json(result);
        

      } catch (error) {
        res.status(500).json({ message: "Error updating job application status", error: error.message });
      }
    });
    



    app.get("/viewJobApplication/:jobId", async (req, res) => {

      const id = req.params.jobId;
      // console.log(id);
      const query = {jobId : id};

      try {
        const result = await jobApplicationCollection.find(query).toArray();
        // console.log(result);
        if (!result) {
          return res.status(404).json({ message: "result not found" });
        }
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ message: "Error fetching result details" });
      }
    });




    // job application api

    app.post("/job-applications", async (req, res) => {
      try {
        const data = req.body;
        
        const jobID = data.jobId;
        const result = await jobApplicationCollection.insertOne(data);

        if (result.acknowledged) {

           //__________________ start application count

          const query = { _id : new ObjectId(jobID)}
          const job = await jobCollection.findOne(query);
          let count = 0;
          if(job.applicationCount){
            count = job.applicationCount + 1;
          }else{
            count = 1;
          }
          const doc = { $set: { applicationCount: count } };
          const result2 = await jobCollection.updateOne(query,doc );

          // __________________End application Count


          res.status(200).json({ success: true, message: "result added successfully" });
          // console.log(result);
        } else {
          res
            .status(500)
            .json({ success: false, message: "Failed to add result" });
        }
      } catch (err) {
        console.error("Error inserting result:", err);
        res
          .status(500)
          .json({ message: "Failed to add result", error: err.message });
      }
    });





    app.get("/applied-job/:email", verifyToken, async (req, res) => {
      const email = req?.params?.email;
      // console.log(email);

      const query = { applicantEmail: email };
      // console.log("Cookies : ", req.cookies);


    // ___________step 6___for jwt and cookies storage

      if(req?.user?.email !== email){
        return res.status(403).json({ success: false, message: "forbidden access" });
      }

      try {
        const result = await jobApplicationCollection
          .find({ applicantEmail: email })
          .toArray();

        for (const item of result) {
          const job = await jobCollection.findOne({
            _id: new ObjectId(item.jobId),
          });
          if (job) {
            item.jobTitle = job.title;
            item.companyName = job.company;
            item.location = job.location;
            item.company_logo = job.company_logo;
          }
        }

        if (!result) {
          return res.status(404).json({ message: "result not found" });
        }
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ message: "Error fetching result details" });
      }
    });




    app.delete("/applied-job/:id", async (req, res) => {
      const id = req.params.id;            // ID for the job application
      const jobId = req.query.jobId;       // Job ID from query parameters
    
      // console.log("JobId:", jobId, "Application Id:", id);
    
      const query = { _id: new ObjectId(id) };    // Query for the job application
      const query2 = { _id: new ObjectId(jobId) }; // Query for the job
    
      try {
        // Check if the application exists in the collection
        const application = await jobApplicationCollection.findOne(query);
        
        if (!application) {
          // If no application is found, return a 404 status
          return res.status(404).json({ message: "Job application not found" });
        }
    
        // Delete the job application from the jobApplicationCollection
        const result = await jobApplicationCollection.deleteOne(query);
        
        if (!result.deletedCount) {
          return res.status(404).json({ message: "Failed to delete job application" });
        }
    
        // Find the job to update the application count
        const job = await jobCollection.findOne(query2);
        
        if (!job) {
          return res.status(404).json({ message: "Job not found" });
        }
    
        // Decrement application count if the job has it, but don't go below 0
        let count = job?.applicationCount || 0;
    
        if (count > 0) {
          count -= 1; // Decrement the application count
        }
    
        const updateDoc = { $set: { applicationCount: count } };
    
        // Update the job's application count
        const result2 = await jobCollection.updateOne(query2, updateDoc);
    
        if (result2.modifiedCount === 0) {
          return res.status(500).json({ message: "Error updating application count" });
        }
    
        // Return a successful response
        res.status(200).json({ message: "Job application deleted and count updated", result });
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Error processing request" });
      }
    });
    



    // add new job

    app.post("/addJob", async (req, res) => {
      try {
        const data = req.body;
        // console.log(data);
        const result = await jobCollection.insertOne(data);

        if (result.acknowledged) {
          res
            .status(200)
            .json({ success: true, message: "result added successfully" });
          // console.log(result);
        } else {
          res
            .status(500)
            .json({ success: false, message: "Failed to add result" });
        }
      } catch (err) {
        console.error("Error inserting result:", err);
        res
          .status(500)
          .json({ message: "Failed to add result", error: err.message });
      }
    });



    // _______________________saved job start

    app.post("/saveJob", async (req, res) => {
      try {
        const data = req.body;
        // console.log(data);
        const result = await saveJobCollection.insertOne(data);

        if (result.acknowledged) {
          res
            .status(200)
            .json({ success: true, message: "result added successfully" });
          // console.log(result);
        } else {
          res
            .status(500)
            .json({ success: false, message: "Failed to add result" });
        }
      } catch (err) {
        console.error("Error inserting result:", err);
        res
          .status(500)
          .json({ message: "Failed to add result", error: err.message });
      }
    });

    
    app.get("/saveJob/:email", async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      const query = { 
        savedUserEmail: email };
      try {
        const result = await saveJobCollection
          .find(query)
          .toArray();

       
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ message: "Error fetching result details" });
      }
    });




  } catch (error) {
    console.error("Error connecting to MongoDB", error);
  } finally {
    // await client.close();
  }
}











run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("Server is running");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
