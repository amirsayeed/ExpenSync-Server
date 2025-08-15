const express = require('express')
const cors = require('cors');
const {
    MongoClient,
    ServerApiVersion,
    ObjectId
} = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dse9fiu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // await client.connect();
        const expensesCollection = client.db("expensync_db").collection("expenses");

        app.get("/expenses", async (req, res) => {
            const email = req.query.email;
            let query = {};

            if (email) {
                query.userEmail = email;
            }

            const expenses = await expensesCollection.find(query).toArray();
            res.send(expenses);
        });

        app.get("/expenses/:id", async (req, res) => {
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

        app.post("/expenses", async (req, res) => {
            const expense = req.body;
            const result = await expensesCollection.insertOne(expense);
            res.send(result);
        });

        app.patch('/expenses/:id', async (req, res) => {
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

        app.delete('/expenses/:id', async (req, res) => {
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