const express = require("express");
const router = express.Router();
var fetchuser = require("../middleware/fetchuser");
var checkUserRole = require("../middleware/checkUserRole")
const Notice = require("../models/Notice");
const User = require("../models/User");
const Funds = require("../models/Funds");
const { body, validationResult } = require("express-validator");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config()

// Load JWT Secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET;


//Route 1 : Create  Notice using : post "/api/secretary/addnotice --->  Login required
router.post("/addnotice",fetchuser, checkUserRole('Admin'),
    [
      body("title", "Title cannot be empty").exists(),
      body("description", "Description should be atleast 5 charactes").exists(),
      body("date","date is required").exists()
    ],
    async (req, res) => {
      try {
        const { title, description, date } = req.body;
        //check validations
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
  
        const notice = new Notice({
          title,
          description,
          date
        });
  
        const saveNotice = await notice.save();
  
        res.json(saveNotice);
      } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
      }
    }
  );

//Route 2 : Read  Notice using : get "/api/secretary/fetchnotices --->  Login required user or admin
router.get("/fetchnotices", fetchuser, async (req, res) => {
  try {
    const notice = await Notice.find();
    res.json(notice);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

//Route 3 : update an exitsting Notice using : post "/api/secretary/updatenotice" required
router.put("/updatenotice/:id", fetchuser,checkUserRole('Admin'), async (req, res) => {
  const { title, description, date } = req.body;
  try {
    // Create a newNotice object
    const newNotice = {};
    if (title) newNotice.title = title;
    if (description) newNotice.description = description;
    const newDate = new Date(date); // Assume 'date' is the received date string
    const utcDate = new Date(Date.UTC(newDate.getFullYear(), newDate.getMonth(), newDate.getDate()));
    if (date) newNotice.date = new Date(utcDate);
    
    // Find the notice to be updated and update it
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({ error: "notice not found" });
    }

    const updatedNotice = await Notice.findByIdAndUpdate(req.params.id, newNotice, {
      new: true,
    });

    res.json({ notice: updatedNotice });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// Route 4: Delete an existing notice using DELETE "/api/secretary/deletenotice/:id"
router.delete("/deletenotice/:id", fetchuser,checkUserRole('Admin'), async (req, res) => {
  try {
    // Find the notice to be deleted
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({ error: "Notice not found" });
    }

    // Delete the notice
    await Notice.findByIdAndDelete(req.params.id);

    // Send a success message
    res.json({ message: "notice deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server Error" });
  }
});

  //Second // Route 1:Create members using: POST "api/secretary/Addmembers". require Admin Login 
  router.post('/Addmembers', fetchuser,checkUserRole('Admin'),[
    body('email').isEmail(),
    body('name').isLength({ min: 3 }),
    body('password').isLength({ min: 5 }),
    body('phone').isLength({min:10}),
    body('Address').isLength({min:10}),
    body('roomNo').exists()
  ], async (req, res) => {
    // Check validations
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        // Check if the email already exists
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
            return res.status(400).json({ errors: [{ msg: 'Email already exists' }] });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        // Create a new user
        const newUser = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
            phone: req.body.phone, 
            role: req.body.role,
            role: "User",
            Address:req.body.Address,
            roomNo:req.body.roomNo
        });

        const saveUser = await newUser.save();

        // Return response with token
        res.json(saveUser);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
  });

//Second // Route 2: Fetch members using: POST "api/secretary/fetchmembers". require  Login admin or user 
router.get("/fetchmembers", fetchuser, async (req, res) => {
  try {
    const user = await User.find().select("-password");
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

//second // Route 3: Delete an existing user using DELETE "/api/secretary/deleteuser/:id"
router.delete("/deleteUser/:id", fetchuser,checkUserRole('Admin'), async (req, res) => {
  try {
    // Find the notice to be deleted
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete the notice
    await User.findByIdAndDelete(req.params.id);

    // Send a success message
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server Error" });
  }
});

//Third // Route 1:Create Funds using: POST "api/secretary/AddFunds". require Admin Login 
router.post('/AddFunds', fetchuser, checkUserRole('Admin'), [
  body('information').isLength({ min: 5 }),
  body('date').exists(),
  body('amount').exists()
], async (req, res) => {
  // Check validations
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Create a new fund
    const fund = await Funds.create({
      information: req.body.information,
      date: req.body.date,
      amount: req.body.amount,
    });

    if (req.body.User) {
      const user = await User.findById(req.body.User);
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }
      fund.user = req.body.User;
    }

    // Return response with the created fund
    res.json(fund );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

//Third //Route 2 fetch Funds using: POST "api/secretary/fetchFunds". require Admin Login 
router.get("/fetchFunds", fetchuser, async (req, res) => {
  try {
    const funds = await Funds.find();
    res.json(funds);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

//Third //Route 3 Delete Funds using  : DELETE "api/secretary/deleteFunds". require Admin Login 
router.delete("/deleteFunds/:id", fetchuser,checkUserRole('Admin'), async (req, res) => {
  try {
    // Find the notice to be deleted
    const funds = await Funds.findById(req.params.id);

    if (!funds) {
      return res.status(404).json({ error: "transaction not found" });
    }

    // Delete the notice
    await Funds.findByIdAndDelete(req.params.id);

    // Send a success message
    res.json({ message: "transaction deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server Error" });
  }
});

//to fetchTotal amount 
router.get("/TotalFunds", fetchuser, async (req, res) => {
  try {
    let Totalfunds =0;
    const funds = await Funds.find();
    
    funds.forEach(fund=>{
      Totalfunds += fund.amount
    })
    res.json(Totalfunds);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

module.exports = router;




