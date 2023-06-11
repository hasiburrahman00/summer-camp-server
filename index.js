const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middlewares: 
app.use(cors())
app.use(express.json());


const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@cluster0.vwsfnb9.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();


        // --- All Database and collections ---
        const database = client.db('summer_camp');
        const users_data = database.collection('users_data');
        const courses = database.collection('courses');
        const carts = database.collection('cart');


        // post all logged in users information
        app.post('/users', async (req, res) => {
            const userData = req.body;
            const query = { email: userData.email }
            const existUser = await users_data.findOne(query)
            if (existUser) {
                return res.send({ message: "user already registered" })
            }
            const result = await users_data.insertOne(userData);
            res.send(result);

        })
        // get all users information:
        app.get('/users', async (req, res) => {
            const result = await users_data.find().toArray();
            res.send(result)
        })

        // get all courses data 
        app.get('/courses', async (req, res) => {
            const result = await courses.find().toArray();
            res.send(result);
        })

        // users added cart data : 
        app.post('/carts', async (req, res) => {
            const item = req.body;
            console.log(item);
            const result = await carts.insertOne(item);
            res.send(result);
        })

        // get carted all data:
        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([])
            }
            const query = { email: email }
            const result = await carts.find(query).toArray();
            res.send(result);
        })

        // delte cart item : 
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await carts.deleteOne(query);
            res.send(result);
        })







        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
    }
}
run().catch(console.dir);




// server running status: 
app.get('/', (req, res) => {
    res.send('summer camp server is running ');
})
app.listen(port, () => {
    console.log(`server is running on port ${port}`)
})