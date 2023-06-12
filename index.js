const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
var jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middlewares: 
app.use(cors())
app.use(express.json());

const varifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'Unauthorize Access' })
    }
    // bearer token 
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decode) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'Unauthorize access ' });
        }
        req.decode = decode;
        next();
    })
}



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

        // jwt token 
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send(token);
        })

        // get all users information:
        app.get('/users', async (req, res) => {
            const result = await users_data.find().toArray();
            res.send(result)
        })

        // Delete user data: 
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await users_data.deleteOne(query);
            res.send(result);
        })

        // update users data as a admin 
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await users_data.updateOne(filter, updateDoc);
            res.send(result);
        })

        // update users data as a Instructor 
        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'instructor'
                },
            };
            const result = await users_data.updateOne(filter, updateDoc);
            res.send(result);
        })


        // get all courses data 
        app.get('/courses', async (req, res) => {
            const result = await courses.find().toArray();
            res.send(result);
        })

        // Insert new course api : 
        app.post('/courses', async (req, res) => {
            const newCourse = req.body;
            const result = await courses.insertOne(newCourse);
            res.send(result);
        })

        // manage courses 
        app.get('/manageCourse', async (req, res) => {
            // const query = { status: `pending`  };
            const query = { status: { $in: ['pending', 'Deny'] } };
            const result = await courses.find(query).toArray();
            res.send(result);
        })

        // update course data:
        app.patch('/courses/:id', async (req, res) => {
            const id = req.params.id;
            console.log("course id", id);
            const feedback = req.body.feedback;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'Deny',
                    feedback: feedback
                },
            };
            const result = await courses.updateOne(filter, updateDoc);
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
        app.get('/carts', varifyJWT, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([])
            }

            const decodedEmail = req.decode.email;
            if (email !== decodedEmail) {
                res.status(403).send({ error: true, message: 'Foridden  access' })
            }


            const query = { email: email }
            const result = await carts.find(query).toArray();
            res.send(result);
        })

        // delete cart item : 
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