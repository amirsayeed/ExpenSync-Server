const express = require('express')
const cors = require('cors');
const {
    MongoClient,
    ServerApiVersion,
    ObjectId
} = require('mongodb');
const admin = require("firebase-admin");
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();

app.use(cors());
app.use(express.json());

const serviceAccount = require("./firebase-admin-service-key.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dse9fiu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyFbToken = async (req, res, next) => {
    const authHeader = req.headers?.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({
            message: 'unauthorized access'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        //console.log('decoded token', decoded);
        req.decoded = decoded;
        next();
    } catch (error) {
        return res.status(401).send({
            message: 'unauthorized access'
        });
    }
}

const verifyTokenEmail = (req, res, next) => {
    if (req.query.email !== req.decoded.email) {
        return res.status(403).send({
            message: 'forbidden access'
        })
    }
    next();
}

async function run() {
    try {
        // await client.connect();
        const expensesCollection = client.db("expensync_db").collection("expenses");

        app.get("/expenses", verifyFbToken, verifyTokenEmail, async (req, res) => {
            const email = req.query.email;
            let query = {};

            if (email) {
                query.userEmail = email;
            }

            const expenses = await expensesCollection.find(query).toArray();
            res.send(expenses);
        });

        app.get("/expenses/:id", verifyFbToken, async (req, res) => {
            try {
                const id = req.params.id;

                const expense = await expensesCollection.findOne({
                    _id: new ObjectId(id)
                });

                if (!expense) {
                    return res.status(404).json({
                        message: "Expense not found"
                    });
                }
                res.json(expense);
            } catch (error) {
                console.error("Error fetching expense:", error);
                res.status(500).json({
                    message: "Server error"
                });
            }
        });

        app.post("/expenses", verifyFbToken, async (req, res) => {
            const expense = req.body;
            const result = await expensesCollection.insertOne(expense);
            res.send(result);
        });

        app.patch('/expenses/:id', verifyFbToken, async (req, res) => {
            try {
                const id = req.params.id;
                const updatedData = req.body;

                const result = await expensesCollection.updateOne({
                    _id: new ObjectId(id)
                }, {
                    $set: updatedData
                });

                res.send(result);
            } catch (error) {
                res.status(500).send(error);
            }
        });

        app.delete('/expenses/:id', verifyFbToken, async (req, res) => {
            try {
                const id = req.params.id;
                const result = await expensesCollection.deleteOne({
                    _id: new ObjectId(id)
                });
                res.send({
                    deletedCount: result.deletedCount
                });
            } catch (err) {
                res.status(500).send({
                    message: 'Failed to delete expense'
                });
            }
        });

        // expense summary
        app.get("/summary", verifyFbToken, verifyTokenEmail, async (req, res) => {
            try {
                const {
                    email
                } = req.query;

                const summary = await expensesCollection.aggregate([{
                        $match: {
                            userEmail: email
                        }
                    },
                    {
                        $group: {
                            _id: "$category",
                            value: {
                                $sum: "$amount"
                            },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            name: "$_id",
                            value: 1,
                        },
                    },
                ]).toArray();

                res.json(summary);
            } catch (error) {
                res.status(500).json({
                    message: "Error fetching summary",
                    error
                });
            }
        });


        // await client.db("admin").command({
        //     ping: 1
        // });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('ExpenSync is running')
})

app.listen(port, () => {
    console.log(`ExpenSync is running on port: ${port}`)
})