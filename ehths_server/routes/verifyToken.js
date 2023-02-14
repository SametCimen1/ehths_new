const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
dotenv.config();

module.exports = async (req,res, next) => {

   const token = req.cookies;
   if(typeof token ==='undefined'){
         
      return res.status(401).json('doesntExist');
   }
   else{
       const {_keh} =token;
    if(!_keh || _keh === 'undefined' || typeof _keh === undefined){
           const _keh = token._keh
           console.log("key doesnt exist")
           return res.status(401).json('doesntExist');
       }
       else{
           try{
            const verify = jwt.verify(_keh, process.env.TOKENSECRET);
            req.user = verify;
            next();
           }
           catch(err){
               return res.status(400).json(err);
           }
        }
   }

  
}
   

