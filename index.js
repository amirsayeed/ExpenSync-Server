const express = require('express')
const cors = require('cors');
const {
    MongoClient,
    ServerApiVersion
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
        const expensesCollection = client.db("expensync_db").collections("expenses");

        app.post("/expenses", async (req, res) => {
            const expense = req.body;
            const result = await expensesCollection.insertOne(expense);
            res.send(result);
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