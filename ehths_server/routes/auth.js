
const router = require('express').Router();
const bcrypt = require('bcrypt');
const pool = require('../Pool');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const xoatuh2 = require('xoauth2')
dotenv.config();

router.post('/signup', async(req,res) => {
    try {
        const {email, password, passwordAgain, name} = req.body;
        if(email === 'afnan@eht.k12.nj.us'){
            if((password === passwordAgain) && password.length > 6){
                const isItUsed = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
                    // if(isItUsed.rowCount === 0){
                            console.log(name)
            
                            let add_id = "";
                            for(let i = 0; i<4; i++){
                                const randomNumber = Math.floor(Math.random()*10);
                                console.log(randomNumber)
                                add_id += Math.floor(Math.random() * 10);
                                
                            }
                            const assignedName = "Afnan Habib";
                            add_id = assignedName.replaceAll(" ", "").toLowerCase() +  add_id;
                            console.log("ADD ID")
                            console.log(add_id)    



                            const sentEmail = async() => {
                                
        
                                const salt = await bcrypt.genSalt(10);
                                const hashPassword = await bcrypt.hash(password, salt);
                                // const lowerCaseName = assignedName.toLowerCase();
                                

                                const makeUser = await pool.query("INSERT INTO users(email, password, role, active, activeCode, name, friends, add_id, about, ownimg, image, friendrequests) VALUES($1, $2, $3,$4,$5, $6, $7, $8, $9, $10, $11, $12)",[email, hashPassword, 'user',true, '', assignedName, [], add_id,'', false, '', []])
                                return res.status(200).json("sent a verification link to your email. Please check it")
                            }


                
                                // sentEmail();
                            



                    // }
                    // else{
                    // return res.json("EMAIL IS USEd")
                    // }
                
            
                }
                else{
                    return res.json("password doenst match")
                }
        }
        else{

                if((password === passwordAgain) && password.length > 6){
                const isItUsed = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
                    if(isItUsed.rowCount === 0){
                        const validateEmail = await pool.query("SELECT * FROM whitelist WHERE email = $1", [email]);
                        if(validateEmail.rows.length > 0){
                            console.log(process.env.EMAILPASSWORD)
                            var transporter = nodemailer.createTransport({
                                host: "smtp-mail.outlook.com", // hostname
                                secureConnection: false, // TLS requires secureConnection to be false
                                port: 587, // port for secure SMTP
                                tls: {
                                ciphers:'SSLv3'
                                },
                                requireTLS:true,//this parameter solved problem for me
                                auth: {
                                user: 'ehths.org@outlook.com',
                                pass: process.env.EMAILPASSWORD
                                }
                            });
                            const alphabet = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
                            let random = "";
                            for(let i = 0; i<20; i++){
                            random += alphabet[Math.floor(Math.random() * 26)]
                            } 
                            const  confirmURL = random;
                            const mailOptions = {
                                from: 'ehths.org@outlook.com',
                                to: email,
                                subject: 'EHTHS students verification code',
                                text: `click this link to verify your account http://localhost:3000/verify/${confirmURL}`
                            };
            
                            let add_id = name;
                            for(let i = 0; i<4; i++){
                                add_id += Math.floor(Math.random() * 10);
                            }


                            const sentEmail = async() => {
                                const assignedName = validateEmail.rows[0].name;
            
                                const salt = await bcrypt.genSalt(10);
                                const hashPassword = await bcrypt.hash(password, salt);
                                // const lowerCaseName = assignedName.toLowerCase();
                                add_id = assignedName.replaceAll(" ", "").toLowerCase() +  add_id;

                                const makeUser = await pool.query("INSERT INTO users(email, password, role, active, activeCode, name, friends, add_id, about, ownimg, image, friendrequests) VALUES($1, $2, $3,$4,$5, $6, $7, $8, $9, $10, $11, $12)",[email, hashPassword, 'user',false, confirmURL, assignedName, [], add_id,'', false, '', []])
                                return res.status(200).json("sent a verification link to your email. Please check it")
                            }


                
                            transporter.sendMail(mailOptions, function(error, info){
                                if (error) {
                                    console.log(error)
                                    return res.status(200).json("Verification email could not be sent")
                            } else{
                            
                                sentEmail();
                            }


                        });
                        }
                        else{
                    
                        return res.json("EMAIL IS not in the whitelist")
                        }
                    }
                    else{
                    return res.json("EMAIL IS USEd")
                    }
                
            
                }
                else{
                    return res.json("password doenst match")
                }
    }    
    } catch (error) {
        console.log(error)
    }   

  
})


router.post('/signin', async(req,res) => {
    const {email, password} = req.body;
    const getUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if(getUser.rowCount === 0){
       return res.status(404).json("user doesnt exist")
    }
    else{
        // user exist;
       const validPassword = await bcrypt.compare(password, getUser.rows[0].password);
       if(validPassword){
          if(getUser.rows[0].active){
        
            const token = jwt.sign({_id: getUser.rows[0].id, email: getUser.rows[0].email, name: getUser.rows[0].name}, process.env.TOKENSECRET, {expiresIn: "3day"});
    
            res.cookie('_keh', token, { secure: process.env.NODE_ENV !== "development",
            httpOnly: true, maxAge: 72 * 60 * 60 * 1000 }); //3days
            res.header('auth-token', token);
            res.status(200).json('token set');
          }
          else{
 
             return  res.status(400).json("you have to activate your account, check your email")
          }
       }
       else{
 
        return res.status(400).json("password is not correct")
       }
    }

    // const validPassword = await bcrypt.compare(req.body.password, user.password);
});

router.post("/logout", async(req,res) => {
    res.clearCookie('_keh')
    res.redirect("http://localhost:3000/")
})


router.post('/verify', async(req,res) => {
    const {email, password, url} = req.body;
    const getUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if(getUser.rowCount === 0){
        return res.json("email doesnt exist")
    }
    else{
        // user exist;
       const validPassword = await bcrypt.compare(req.body.password, getUser.rows[0].password);
       if(validPassword){
          if(!getUser.rows[0].active){
            await pool.query('UPDATE users SET active = $1, activecode = $2 WHERE email = $3', [true,'',email]);
              return res.status(200).json("everything went well, redirecting to sign in page")  //everyting OK 
          }
          else{
            return res.status(502).json("its already activated")
          }
       }
       else{
      
           res.status(406).json("password is not correct")
       }
    }
    res.end();
  
});




module.exports = router;