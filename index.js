const express = require('express');
const app = express();
const dotenv = require('dotenv').config();
const mongodb = require('mongodb')
const mongoClient = mongodb.MongoClient;
const cors = require('cors');
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');
const multer = require('multer');
const URL = process.env.DB;
const DB = "reoncrud";
const path = require('path');


app.listen(process.env.PORT || 3000, () => {
   console.log(`server is listening on port ${process.env.PORT || 3000}`);
})

//middleware 
app.use(express.json());
app.use(cors({
    // origin:"http://localhost:3001",
    origin:"https://vijaycrudformfrontend.netlify.app"
}))

//welcome api
app.get('/', (req,res)=>{
    res.send("welcome to Reon CRUD Application")
})

//Authentication
const Authenticate = (req,res,next) => {
    if (req.headers.authorization) {
        try {
            const decode = jwt.verify(req.headers.authorization, process.env.SECRET);
            console.log(decode);
            if(decode){
                next()
            }
        } catch (error) {
            res.status(401).json({message:"UnAuthorized"})
        }
    } else {
        res.status(401).json({message:"UnAuthorized"})
    }
};

//multer middleware 
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '../crudformfrontend/src/images/');
      },
    filename : function (req,file,cb){
        const uniqueSuffix = Date.now();
      cb(null, uniqueSuffix + file.originalname);
    }
})

const upload = multer({storage: storage})

// post user datas
app.post('/createUser',Authenticate,upload.single('image'),async(req,res) => {
    const imageName = req.file.filename;
    try {
        const connection = await mongoClient.connect(URL);
        const db = connection.db(DB);
        req.body.image=imageName;
        const allpost = await db.collection('userdatas').insertOne(req.body)
        await connection.close();
        console.log(allpost);
        res.json({message:"User Datas created successfully"});

    } catch (error) {
        res.json({message:"user side error"});
    }
})

// get the all users datas
app.get('/getAllUsers',Authenticate, async(req,res) => {
    try {
        const connection = await mongoClient.connect(URL);
        const db = connection.db(DB);
        const allusers = await db.collection('userdatas').find().toArray();
        await connection.close();
        res.json(allusers);
    } catch (error) {
        res.json({message:"something went wrong"});
    }
})

// view specific user
app.get('/viewUser/:id',Authenticate, async (req,res) => {
    try {
        const connection = await mongoClient.connect(URL);
        const db =  connection.db(DB);
        const viewUser = await db.collection('userdatas').findOne({_id : new mongodb.ObjectId(req.params.id)});
        await connection.close();
        res.json(viewUser);
    } catch (error) {
        res.json({message:"something went wrong"});
    }
})

// Edit specific user
app.put('/editUser/:id',Authenticate,upload.single('image'), async (req,res) => {
    const imageName = req.file.filename;
    try {
        const connection = await mongoClient.connect(URL);
        const db = connection.db(DB);
        req.body.image=imageName;
        const editUser = await db.collection('userdatas').findOneAndUpdate({_id : new mongodb.ObjectId(req.params.id)},{$set:req.body});
        await connection.close();
        res.json(editUser);
    } catch (error) {
        res.json({message:"something went wrong"});
    }
})

// Delete specific user
app.delete('/deleteUser/:id',Authenticate, async (req,res) => {
    try {
        const connection = await mongoClient.connect(URL);
        const db = connection.db(DB);
        await db.collection('userdatas').findOneAndDelete({_id : new mongodb.ObjectId(req.params.id)});
        await connection.close();
        res.json({message:'Delete successful'});
    } catch (error) {
        res.json({message:"something went wrong"});
    }
})

// new user account 
app.post('/createAccount',async (req,res) => {
    try {
        const connection = await mongoClient.connect(URL);
        const db = connection.db(DB);
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(req.body.password,salt);
        req.body.password = hash;
        await db.collection('useraccounts').insertOne(req.body);
        await connection.close();
        res.json({message : "Account Created"});
    } catch (error) {
        res.json({message:"something went wrong"});
    }
})

// Login user account
app.post('/login',async (req,res) => {
    try {
        const connection = await mongoClient.connect(URL);
        const db = connection.db(DB);
        const userAccount = await db.collection('useraccounts').findOne({ email: req.body.email});
        if (userAccount) {
            const compare = await bcrypt.compare(req.body.password, userAccount.password);
            if (compare) {
                const token = jwt.sign({_id: userAccount._id},process.env.SECRET,{expiresIn:"20min"})
                res.json(token);
            } else {
                res.json({message:'Enter the Correct Password'})
            }
        } else {
            res.status(401).json({message:'Enter the Correct Email'})
        }
    } catch (error) {
        res.status(500).json({message:"something went wrong"});
    }
})