require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
var jwt = require('jsonwebtoken');
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
        // await client.connect();



        // --- All Database and collections ---
        const database = client.db('summer_camp');
        const users_data = database.collection('users_data');
        const courses = database.collection('courses');
        const carts = database.collection('cart');
        const payments = database.collection('payments');


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

        // warning: use verify jwt before using verify admin: 
        const verifyAdmin = async (req, res, next) => {
            const email = req.decode.email;
            const query = { email: email }
            const user = users_data.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }
            next();
        }










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

        // our all instructors 
        app.get('/indtructors', async (req, res) => {
            const query = { status: { $ne: "Deny" } }
            const result = await courses.find(query).toArray();
            res.send(result)
        })

        // popular instructors api: 
        app.get('/popularInstructors', async (req, res) => {
            const result = await courses.find({ status: { $ne: "pending" } }).sort({ enrolledStudents: -1 }).limit(6).toArray();
            res.send(result);
        })




        // admin check api: 
        app.get('/users/admin/:email',  async (req, res) => {
            const email = req.params.email;

            if (req.decode.email !== email) {
                return res.send({ admin: false })
            }

            const query = { email: email }
            const user = await users_data.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        })

        //instructors check: 
        app.get('/users/instructor/:email', async (req, res) => {
            const email = req.params.email;

            if (req.decode.email !== email) {
                return res.send({ instructor: false })
            }

            const query = { email: email }
            const user = await users_data.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            res.send(result);
        })


        // get all courses data 
        app.get('/courses', async (req, res) => {
            const result = await courses.find().toArray();
            const approved = result.filter(item => item.status !== 'Deny');
            res.send(approved);
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
        // popular courses api : 
        app.get('/popularCourses', async (req, res) => {
            const result = await courses.find({ status: { $ne: "pending" } }).sort({ enrolledStudents: -1 }).limit(6).toArray();
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
                return res.send([]) // add return time: 12.59
            }

            const decodedEmail = req.decode.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'Foridden  access' }) // add (return ) 12.59
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

        // payment intentd:
        app.post('/create-payment-intend', varifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            console.log(price);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card'],

            })
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        // payments data: 
        app.post('/payments', varifyJWT, async (req, res) => {
            const payment = req.body;
            console.log(payment?.items)
            const paymentResult = await payments.insertOne(payment)
            const query = { _id: { $in: payment?.items.map(item => new ObjectId(item)) } }
            console.log(query);
            const deleteCartResult = await carts.deleteMany(query)
            res.send({ paymentResult, deleteCartResult })
        })

        // get payment history:
        app.get('/paymentHistory/:email', async(req, res) => {
            const email = req.params.email;
            const result = await payments.find({email}).toArray();
            console.log("line no 281", email,  result);
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