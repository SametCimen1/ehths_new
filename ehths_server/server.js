const express = require('express');
const app = express();
const auth = require('./routes/auth');
const user = require('./routes/user');
const posts = require('./routes/posts');
const router = require('./routes/router')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./routes/groups');
const cors = require('cors');
const bodyParser = require('body-parser')
const verifyToken = require('./routes/verifyToken')
const cookieParser = require('cookie-parser')
const pool = require('./Pool')
const jwt = require('jsonwebtoken');

const fileUpload = require('express-fileupload');
// const socketio = require('socket.io');
// const http = require('http');




const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, ()=>{
    console.log("listening")
});
const io = require('socket.io')(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});




app.use(cookieParser())
app.use(fileUpload())

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
}) 

const corsOptions ={
    origin:'http://localhost:3000', 
    credentials:true,            //access-control-allow-credentials:true
    optionSuccessStatus:200
  }
app.use(cors(corsOptions))
app.use(bodyParser.json());


app.use(express.static('userimg'))





app.post('/userexist', async(req,res) => {
    const cookies = req.cookies;
    if(cookies._keh){
        const {_keh} = req.cookies;
        const verified = jwt.verify(_keh, process.env.TOKENSECRET);
        if(verified._id){
            try{
                const data = await pool.query('SELECT * FROM users WHERE id = $1', [verified._id]);
                const user = await data.rows[0];
                if(user){
                //   console.log('everything went ok user exist')
                  res.json(true);
                }  
            }
            catch (err){
             console.log(err)
            }
        }
    }

})

app.use('/user', verifyToken,user);
app.use('/auth', auth);
app.use('/posts', verifyToken, posts);

io.on('connection',(socket) => {
  


   socket.on('join', ({friendName, myName, roomName}, callback) => {
    const { error, user } = addUser({ id: socket.id, name: myName, room: roomName, friendName:friendName});
 
    if(error) return callback(error);






    //  socket.broadcast() send message to everyone except who just joined
     socket.broadcast.to(roomName).emit('message', {user:"admin", text: myName + ' joined'})

     socket.join(roomName);

     socket.emit('message', {user:'admin', text:`welcome to the room`});


    //  const error =true
    //  if(error) {
    //     callback({error:"error"});
    //  }
 

    callback();
   });



   socket.on('sendMessage', (message, callback) => {
       const user = getUser(socket.id);





   
       if(typeof user === "undefined"){
      
           callback("userUndefined")
       }
       else{
        io.to(user.room).emit('message', { user: user.name, text: message });
       }

   })


   socket.on('disconnect', ()=>{
    const user = removeUser(socket.id);
   
       if(user) {
        io.to(user.room).emit('message', { user: 'Admin', text: `${user.name} has left.` });
        io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});
      }
   })

});


// server.listen(PORT, () => {
//     console.log(`listening on ${PORT}`)
// })