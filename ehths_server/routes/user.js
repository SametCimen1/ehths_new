const csrf = require('csurf')
const csrfProtection = csrf({cookie:true})
const router = require('express').Router();
const fs = require('fs');
const bodyParser = require('body-parser')
const pool = require('../Pool');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
dotenv.config();

router.post('/getUser', async(req,res) => {
    const user = req.user;
    if(user){
        const data = await pool.query("SELECT add_id, name, email, ownimg, image, about FROM users WHERE id = $1", [user._id]);
        return res.status(200).json(data.rows[0]);
    }
    else{

       return res.status(401).redirect('http://localhost:3000/');
    }
})
router.post('/getMyName', async(req,res) => {
    const user = req.user;
    return res.json(user.name)
})
router.post("/getSingleUser", async(req,res) => {
    const user = req.user;
    if(user){
      const userId = req.body.userId;

      const data = await pool.query("SELECT id, name, ownimg, image FROM users WHERE id = $1", [userId]);
      return res.status(200).json(data.rows[0]);
      
    }
    else{

        return res.status(401).json("unauthrized").redirect('/401');
    }
})


router.post('/getUserById', async(req,res) => {
    const userId = req.body.id;


    if(userId){
        const data = await pool.query("SELECT name, email,about, ownimg, image FROM users WHERE id = $1", [userId]);
        if(data.rows.length === 0){
           return res.status(404).json([])
        }
        else{
            const email = req.user.email;
            data.rows[0].isMe = email === data.rows[0].email;

            return res.status(200).json(data.rows[0]);
        }

    }
    else{

       return res.status(401).json("unauthrized").redirect('/401');
    }
})



router.post('/myPost', async(req,res) => {
    const userId = req.body.userid;
    const id = req.body.id;
    console.log("IN MY POST")
    console.log(req.body.type)


        if(req.body.type === null || typeof req.body.type === undefined){
            return res.status(500).json("error")
        }
        else if(req.body.type === 'community'){

            const data = await pool.query('SELECT * FROM groupposts WHERE id = $1 AND userid = $2', [id, req.user._id])
            if(data.rowCount === 1){
                return res.json(true);
            }
            else{
                return res.json(false);
            }
        
        }
        else if (req.body.type === 'post'){
            const data = await pool.query('SELECT * FROM posts WHERE id = $1 AND userid = $2', [id, req.user._id])
            if(data.rowCount === 1){
                return res.json(true);
            }
            else{
                return res.json(false);
            }
        }
        else if (req.body.type === 'friendposts'){
            const data = await pool.query('SELECT * FROM friendposts WHERE id = $1 AND userid = $2', [id, req.user._id])
            console.log(id)
            if(data.rowCount === 1){
                console.log("SENT TRUE")
                return res.json(true);
            }
            else{
                console.log("SENT FALSE")
                return res.json(false);
            }
        }
})


router.post('/getuserByIdParameter', async(req,res) => {
    const userId = req.body.id;
    if(userId){
        const data = await pool.query("SELECT name, friends, email,about, ownimg, image FROM users WHERE id = $1", [userId]);
        if(data.rowCount === 0){
           return res.status(404).json([])
        }
        else{
            const email = req.user.email;
              const obj  = {
                name: data.rows[0].name,
                isFriend: data.rows[0].friends.includes(req.user._id),
                email : data.rows[0].email,
                about: data.rows[0].about,
                ownimg: data.rows[0].ownimg,
                image: data.rows[0].image,
                isMe: email === data.rows[0].email
              }
            return res.status(200).json(obj);
        }

    }
    else{

       return res.status(401).json("unauthrized").redirect('/401');
    }
})

router.post('/getFriends', async(req,res) => {
    const user = req.user;
    let myFriends = [];
    if(user){
        const myUser = await pool.query("SELECT friends FROM users WHERE id = $1", [user._id]);
        const {friends} = myUser.rows[0];
        if(friends.length === 0){
            return res.status(200).json([])
        }
        else{
            for(let i = 0; i<friends.length; i++){
                const friendData =  await pool.query("SELECT  id, name, email,ownimg, image  FROM users WHERE id = $1", [friends[i]]);
                const friend = friendData.rows[0];
                myFriends.push(friend);
            }
            return res.status(200).json(myFriends)
        }
    }
    else{

       return res.status(401).json("unauthrized").redirect('/401');
    }
})

router.post("/removeFriend", async(req,res) => {

    try {
        if(req.body.type === "friend"){
            const cancelMine = await pool.query("UPDATE users SET friends = array_remove(friends, $1) WHERE id = $2", [req.user._id, req.body.id])
            const data = await pool.query("UPDATE users SET friends = array_remove(friends, $1) WHERE id = $2", [req.body.id, req.user._id])
            return res.status(200).json("true")
        }
        else{
            const cancelMine = await pool.query("UPDATE users SET friendrequests = array_remove(friendrequests, $1) WHERE id = $2", [req.user._id, req.body.id])
            const data = await pool.query("UPDATE users SET friendrequests = array_remove(friendrequests, $1) WHERE id = $2", [req.body.id, req.user._id])
            return res.status(200).json("true")
        }
      
    } catch (error) {
        console.log(error)
        return res.status(500).json(error)
    }
})

router.post('/getGroups', async(req,res) => {
    const user = req.user;
    let myFriends = [];
    if(user){
        const myUser = await pool.query("SELECT * FROM users WHERE id = $1", [user._id]);
        const {friends} = myUser.rows[0];
        if(friends.length === 0){
            return res.status(200).json([])
        }
        else{
            for(let i = 0; i<friends.length; i++){
                const friendData =  await pool.query("SELECT  name, email  FROM users WHERE id = $1", [friends[i]]);
                const friend = friendData.rows[0];
                myFriends.push(friend);
            }
            return res.status(200).json(myFriends)
        }
    }
    else{

       return res.status(401).json("unauthrized").redirect('/401');
    }
})

router.post('/sendFriendRequest', async(req,res) => {
    const myId = req.user._id
    const id = req.body.id;

    if(id !== req.user._id){
        if(id && myId){
            const doesItExist = await pool.query("SELECT * FROM users WHERE id = $1 AND  $2 = ANY (friendrequests)", [id, myId]);
            if(doesItExist.rowCount > 0){

               return res.status(400).json("already sent")
            }
            else{
            const data = await pool.query('UPDATE users SET friendrequests = array_append(friendrequests, $1) WHERE id = $2', [myId, id]);

            return res.status(200).json("SENT")
            }
        }
        else{

           return res.status(401).json("unauthrized").redirect('/401');
        }
    }
    else{
   
        return res.status(400).json("you cant send request to yourself")
    }



    
})


router.post('/sendFriendRequestbycode', async(req,res) => {
    const userId = req.body.friendCode;
    const id = req.user._id; 

    if(id && userId){
        try {
                 const doesItExist = await pool.query("SELECT * FROM users WHERE add_id = $1 AND  $2 = ANY (friendrequests)", [userId, id]);
                 if(doesItExist.rowCount > 0){

                   return res.status(400).json("already sent")
                }
            
                else{
                    const doesUserExist = await pool.query("SELECT * FROM users WHERE add_id = $1", [req.body.friendCode]);
                    if(doesUserExist.rows[0].id === id){
                        return res.status(500).json("You can not send request to yourself")
                    }
                     else if(doesUserExist.rowCount > 0){
                    const data = await pool.query('UPDATE users SET friendrequests = array_append(friendrequests, $1) WHERE add_id = $2', [id, userId]);
                      return res.status(400).json("SENT")
                    }
                      else{
                    return res.status(404).json("USer doesnt exist")
                }
            }
        } catch (error) {

            return res.status(500).json("Error occured, please try again")
        }
        
    }

});


router.post('/friendRequests',async(req,res) => {
    const user = req.user;

    if(user){
        const data = await pool.query("SELECT friendrequests FROM users WHERE id = $1", [user._id]);
        if(data.rowCount>0){
            const friendRequests = data.rows[0];
            return res.status(200).json(friendRequests)
        }
        else{
            return res.status(500).json("server error")
        }
    }
    else{
       return res.json(401).json("log in")
    }
})


router.post("/acceptfriend", async(req,res) => {
    try{
        const sender = req.body.id; // 1
        const receiver = req.user._id; //3


        const doesItExist = await pool.query("SELECT * FROM users WHERE id = $1 AND  $2 = ANY (friendrequests)", [receiver, sender]);
        if(doesItExist.rowCount > 0){
            const updateSender = await pool.query("UPDATE users SET friendrequests = array_remove(friendrequests, $1), friends = array_append(friends, $2) WHERE id = $3 ",[sender, sender, receiver])
            const updateFollowers = await pool.query('UPDATE users SET friends = array_append(friends, $1)  WHERE id = $2',[receiver, sender]);
            const doesSenderExist = await pool.query("SELECT * FROM users WHERE id = $1 AND  $2 = ANY (friendrequests)", [sender, receiver]);
            if(doesSenderExist.rowCount > 0){
                const updateRequest = await pool.query('UPDATE users SET friendrequests = array_remove(friendrequests, $1)  WHERE id = $2',[receiver, sender]);
           }
            
        
        }
            

        return res.status(200).json("updated")
    }
    catch (err){

        return res.status(500).json("server error")
    }


})

router.get("/getcsrf", csrfProtection, async(req,res) => {
    res.json(req.csrfToken())    
})

router.post("/updateData", csrfProtection, async(req,res) => {
    const user = req.user;
    

    
    if(user){
        if((req.files && Object.keys(req.files).length !== 0) && req.body.about ===""){ 
            uploadImg(req.files,user._id)

            }
            else if (req.files === null && req.body.about !==""){

                const data = await pool.query("UPDATE users SET about = $1 WHERE id = $2", [req.body.about, user._id])
            }
            else if((req.files && Object.keys(req.files).length !== 0) && req.body.about !==""){
      
                const data = await pool.query("UPDATE users SET about = $1 WHERE id = $2", [req.body.about, user._id])
                uploadImg(req.files,user._id)
            }
            
            res.redirect(`http://localhost:3000/profile`);
    }
    else{

        return res.redirect(`http://localhost:3000/unauth`);
    }

    
})
router.post("/makegroup", async(req,res) => {
        const user = req.user;

        if(user){
            if((req.files && Object.keys(req.files).length !== 0) && req.body.groupName !=="" &&  req.body.groupTitle !==""&& req.body.groupDescription !=="" ){ 
                uploadImg(req.files, req.user._id, true, req.body)            
                res.redirect(`http://localhost:3000/connect/communities`);
                
            }
            else{
                res.json("empty fields")
            }
        }
         else{
          res.status(401).json("unauth")
         }   

    
})

router.post("/updategroupimage", async(req,res) => {
    const user = req.user;
    console.log(req.body)

        if(user){
            if((req.files && Object.keys(req.files).length !== 0)){ 
                updategroupImage(req.files, req.body.groupid)            
                res.redirect(`http://localhost:3000/connect/communities`);
                
            }
            else{
                res.json("empty fields")
            }
        }
         else{
          res.status(401).json("unauth")
         }   
})

const updategroupImage = async(files, id) => {
    const alphabet = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];
    let random = "";
    for(let i = 0; i<10; i++){
      random += alphabet[Math.floor(Math.random() * 26)]
    } 
    const newimg = files.newimg;
    const imageName = random + newimg.name
    newimg.mv('./userimg/img/' + imageName);
    const updateImage = await pool.query("UPDATE groups SET groupimage = $1 WHERE id = $2", [imageName, id])
}
const uploadImg = async(files, id, groups, body) => {
    if(groups){      
        const alphabet = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];
        let random = "";
        for(let i = 0; i<10; i++){
          random += alphabet[Math.floor(Math.random() * 26)]
        } 
        const newimg = files.newimg;
        const imageName = random + newimg.name
        newimg.mv('./userimg/img/' + imageName);

        const updateImg = await pool.query('INSERT INTO groups(groupname, members, grouptitle, groupdescription, postsid, groupimage, createdby) VALUES($1, $2, $3, $4, $5, $6, $7)', [body.groupName, [id], body.groupTitle, body.groupDescription, [], imageName, id]);
    }
    else{
        const imgName = await pool.query('SELECT image, ownimg FROM users WHERE id = $1', [id]);
  
        if(imgName.rows[0].ownimg){
          fs.unlink(`./userimg/img/${imgName.rows[0].image}`, function (err) {
            if (err) console.log(err);
            // if no error, file has been deleted successfully
      
          }); 
        }
      
        const alphabet = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];
        let random = "";
        for(let i = 0; i<10; i++){
          random += alphabet[Math.floor(Math.random() * 26)]
        } 
        const newimg = files.newimg;
        const imageName = random + newimg.name
        newimg.mv('./userimg/img/' + imageName);
        const updateImg = await pool.query('UPDATE users SET ownimg = true, image = $1 WHERE id = $2', [imageName, id]);
    }
   
  }




router.post("/getDefaultPosts", async(req,res) => {
    try{
        const data = await pool.query("SELECT * FROM posts ORDER BY id DESC LIMIT 10")
        if(data.length === 0){  
            return res.status(404).json("No post avaible rn")
        }
        else{
            if(typeof req.body.smallestId === 'undefined'){
                const data = await pool.query("SELECT likedby,comments,id,likes,text,title,uploadtime, userid FROM posts ORDER BY id DESC LIMIT 5")
                const arr = [];
                if(data.rowCount === 0){
                  return res.json("no more post avaible")
                }
                else{
                    for(let i =0; i<data.rows.length; i++){
                        const obj = {
                            didILike:data.rows[i].likedby.includes(req.user._id),
                            comments:data.rows[i].comments,
                            id:data.rows[i].id,
                            likes:data.rows[i].likes,
                            text:data.rows[i].text,
                            title: data.rows[i].title,
                            uploadtime:data.rows[i].uploadtime,
                            userid:data.rows[i].userid
                        }
                        arr.push(obj);
            
               
                    }
                    return res.status(200).json(arr)
                }
            }
            else{
                const data = await pool.query("SELECT likedby,comments,id,likes,text,title,uploadtime, userid FROM posts WHERE id < $1 ORDER BY id DESC LIMIT 5", [req.body.smallestId])

                if(data.rowCount === 0){
                  return res.json("no more post avaible")
                }
                else{
                    const arr = [];
                    for(let i =0; i<data.rows.length; i++){
                        const obj = {
                            didILike:data.rows[i].likedby.includes(req.user._id),
                            comments:data.rows[i].comments,
                            id:data.rows[i].id,
                            likes:data.rows[i].likes,
                            text:data.rows[i].text,
                            title: data.rows[i].title,
                            uploadtime:data.rows[i].uploadtime,
                            userid:data.rows[i].userid
                        }
                        arr.push(obj);
            
               
                    }
                    return res.status(200).json(arr)
                }
            }
           
            
         
           
        }
        res.json(data.rows)
    }
    catch (err){
        res.status(500).json(err)
    }
    
})

router.post("/makePost", async(req,res) => {

    try{

        const dateObj = new Date();
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();
        const seconds = dateObj.getSeconds();
        const minutes = dateObj.getMinutes();
        const hour = dateObj.getHours();
        const currentTime = `${year}-${month}-${day} ${hour}:${minutes}:${seconds}`
        const data = await pool.query("INSERT INTO posts(userid, title, text, uploadtime,commentby,likedby, likes, comments) VALUES($1, $2,$3,$4,$5,$6,$7, $8)", [req.user._id,  req.body.subject, req.body.paragraph, currentTime, [], [], 0, 0])
        return res.json("Successfully added a post")
    }
    catch (err){

        return res.status(500).json(err)

    }

})

router.get("/getmyposts", async(req,res) => {
    try{
        
    const friendpost = await pool.query("SELECT * FROM friendposts WHERE userid= $1 ORDER BY id DESC LIMIT 5", [req.user._id]);
    const grouppost = await pool.query("SELECT * FROM groupposts WHERE userid= $1 ORDER BY id DESC LIMIT 5", [req.user._id]);
    const post = await pool.query("SELECT * FROM posts WHERE userid= $1 ORDER BY id DESC LIMIT 5", [req.user._id]);

    const  friendPostsArr =  [];

    for(let i = 0; i<friendpost.rows.length; i++){
        const obj = {
            didILike:friendpost.rows[i].likedby.includes(req.user._id),
            comments:friendpost.rows[i].comments,
            id:friendpost.rows[i].id,
            likes:friendpost.rows[i].likes,
            text:friendpost.rows[i].text,
            title: friendpost.rows[i].title,
            uploadtime:friendpost.rows[i].uploadtime,
            userid:friendpost.rows[i].userid
        }
        friendPostsArr.push(obj);
    }

    const  myGroupPosts =  [];
    for(let i = 0; i<grouppost.rows.length; i++){
        const obj = {
            didILike:grouppost.rows[i].likedby.includes(req.user._id),
            comments:grouppost.rows[i].comments,
            id:grouppost.rows[i].id,
            likes:grouppost.rows[i].likes,
            text:grouppost.rows[i].text,
            title: grouppost.rows[i].title,
            uploadtime:grouppost.rows[i].uploadtime,
            userid:grouppost.rows[i].userid
        }
        myGroupPosts.push(obj);
    }

    const  myPosts =  [];
    for(let i = 0; i<post.rows.length; i++){
        const obj = {
            didILike:post.rows[i].likedby.includes(req.user._id),
            comments:post.rows[i].comments,
            id:post.rows[i].id,
            likes:post.rows[i].likes,
            text:post.rows[i].text,
            title: post.rows[i].title,
            uploadtime:post.rows[i].uploadtime,
            userid:post.rows[i].userid
        }
        myPosts.push(obj);
    }


    const obj = {
        friendpost:friendPostsArr,
        grouppost:myGroupPosts,
        post:myPosts,
    };

    res.json(obj);
    }
    catch(err){

        res.status(500).json(err)
    }

})

router.post("/getimg", async(req,res) => {
   
    const data = await pool.query("SELECT ownimg, image FROM users WHERE id = $1", [req.body.userid]);

    res.json(data.rows[0])
})

router.get("/getMyGroups", async(req,res) => {
    const group = await pool.query("SELECT * FROM groups WHERE $1 = ANY (members) ORDER BY id DESC LIMIT 5", [req.user._id]);
    const arr = [];

    for(let i =0; i< group.rowCount; i++){
        const obj = {
            id:group.rows[i].id,
            didIJoin:group.rows[i].members.includes(req.user._id),
            groupname: group.rows[i].groupname,
            memberCount:group.rows[i].members.length,
            groupTitle: group.rows[i].grouptitle,
            groupDescription: group.rows[i].groupdescription,
            groupimage: group.rows[i].groupimage
        }
        arr.push(obj)
    }
    res.json(arr)
})

router.post("/joinGroup", async(req,res) => {
    try {
        const amIMember = await pool.query('SELECT * FROM groups WHERE id = $1  AND $2 = ANY(members)', [req.body.id, req.user._id]);
      
        if(amIMember.rowCount === 0){
            const data = await pool.query('UPDATE groups SET members = array_append(members, $1) WHERE id = $2', [req.user._id, req.body.id]);    
            res.status(200).json("ok")

        }
        else{
            res.status(503).json("already in the groups")
        }
        
    } catch (error) {
        res.json(500).json("error, please try again later")
    }
    
    
})

router.get("/getGroups", async(req,res) => {
    const group = await pool.query("SELECT * FROM groups ORDER BY id DESC LIMIT 5");
    const arr = [];

    for(let i =0; i< group.rowCount; i++){
        const obj = {
            id:group.rows[i].id,
            groupname: group.rows[i].groupname,
            didIJoin:group.rows[i].members.includes(req.user._id),
            memberCount:group.rows[i].members.length,
            groupTitle: group.rows[i].grouptitle,
            groupDescription: group.rows[i].groupdescription,
            groupimage: group.rows[i].groupimage
        }
        arr.push(obj)
    }

    res.json(arr);
})


router.post("/makeFriendPost", async(req,res) => {
    console.log("HIT IN MAKE FRIEND POST")
    try{
        const dateObj = new Date();
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();
        const seconds = dateObj.getSeconds();
        const minutes = dateObj.getMinutes();
        const hour = dateObj.getHours();
        const currentTime = `${year}-${month}-${day} ${hour}:${minutes}:${seconds}`
        const data = await pool.query("INSERT INTO friendposts(userid, title,text,uploadtime, commentby, likedby, likes, comments) VALUES ($1,$2, $3,$4,$5,$6,$7,$8)", [req.user._id, req.body.title, req.body.text, currentTime, [], [], 0, 0],);
        res.json(true)
    }
    catch (err){
 

        res.json(err)

    }
})


router.post("/getFriendPosts", async(req,res) => {
    const friends = await pool.query("SELECT friends FROM users WHERE id = $1", [req.user._id]);

    if(friends.length === 0){  
        return res.status(404).json([])
    }
    else{
        friends.rows[0].friends.push(req.user._id);
        console.log(friends)
        if(typeof req.body.smallestId == 'undefined'){
            const data = await pool.query("SELECT likedby,comments,id,likes,text,title,uploadtime, userid FROM friendposts WHERE userid = ANY ($1) ORDER BY id DESC LIMIT 5", [friends.rows[0].friends])
            const arr = [];
            if(data.rowCount === 0){
              return res.json("no more post avaible")
            }
            else{
                for(let i =0; i<data.rows.length; i++){
                    const obj = {
                        didILike:data.rows[i].likedby.includes(req.user._id),
                        comments:data.rows[i].comments,
                        id:data.rows[i].id,
                        likes:data.rows[i].likes,
                        text:data.rows[i].text,
                        title: data.rows[i].title,
                        uploadtime:data.rows[i].uploadtime,
                        userid:data.rows[i].userid
                    }
                    arr.push(obj);
        
           
                }
                return res.status(200).json(arr)
            }
        }
        else{
            const data = await pool.query("SELECT likedby,comments,id,likes,text,title,uploadtime, userid FROM friendposts WHERE userid = ANY ($1) AND id < $2 ORDER BY id DESC LIMIT 5", [friends.rows[0].friends, req.body.smallestId])
    
            if(data.rowCount === 0){
              return res.json("no more post avaible")
            }
            else{
                const arr = [];
                for(let i =0; i<data.rows.length; i++){
                    const obj = {
                        didILike:data.rows[i].likedby.includes(req.user._id),
                        comments:data.rows[i].comments,
                        id:data.rows[i].id,
                        likes:data.rows[i].likes,
                        text:data.rows[i].text,
                        title: data.rows[i].title,
                        uploadtime:data.rows[i].uploadtime,
                        userid:data.rows[i].userid
                    }
                    arr.push(obj);
        
           
                }
                return res.status(200).json(arr)
            }
        }
       
        
     
       
    }

})

router.post('/report', async(req,res) => {
    try {
        const howManySent = await pool.query("SELECT COUNT (*) FROM errors WHERE userid = $1", [req.user._id]);
        const count = howManySent.rows[0].count;
        if(count > 20){
            if(req.body.email === ''){
                const data = await pool.query("INSERT INTO errors(userid, error, email) VALUES($1, $2, $3)", [req.user._id, req.body.error, req.body.email])
                res.json("sent the error Thanks")
            }
           else{
            const data = await pool.query("INSERT INTO errors(userid, error, email) VALUES($1, $2, $3)", [req.user._id, req.body.error, ''])
            res.json("sent the error Thanks")
           }  
        }
        else{
            res.status(500).json("You have sent more than 20 error messages. Did not sent the error")
        }
      
    } catch (error) {
        res.status(500).json(error)
    }

})

router.get('/getCommunitiePosts', async(req,res) => {
    const id = req.user._id;
    const groups = await pool.query("SELECT * FROM groups WHERE $1 = ANY(members)", [id]);

    const ids = [];
    for(let i = 0; i < groups.rows.length; i++){
        for(let x =0; x< groups.rows[i].postsid; x++){
            ids.push(groups.rows[i].postsid[x]);
        }
    }
    const posts = [];
    for(let i = ids.length-1; i >=0; i--){
        const data = await pool.query("SELECT * FROM groupposts WHERE id = $1", [ids[i]]);
        const response = data.rows[0];
        posts.push(response);
    }

    
    

    res.json(posts)
})

router.post("/unlikepost", async(req,res) => {
    if(req.body.type === null || typeof req.body.type === undefined){
        return res.status(500).json("error")
    }
    else if(req.body.type === 'community'){

        const postid = req.body.id;
        const updateLikedArray = await pool.query('UPDATE groupposts SET likedby = array_remove(likedby, $1)  WHERE id = $2', [req.user._id, postid])
        const updateLikes = await pool.query('UPDATE groupposts SET likes = likes - $1  WHERE id = $2', [1, postid])
        res.json("ok")

    }
    else if (req.body.type === 'post'){
        
        const postid = req.body.id;
        const updateLikedArray = await pool.query('UPDATE posts SET likedby = array_remove(likedby, $1)  WHERE id = $2', [req.user._id, postid])
        const updateLikes = await pool.query('UPDATE posts SET likes = likes - $1  WHERE id = $2', [1, postid])
        res.json("ok");
    }
    else{
        const postid = req.body.id;
        const updateLikedArray = await pool.query('UPDATE friendposts SET likedby = array_remove(likedby, $1)  WHERE id = $2', [req.user._id, postid])
        const updateLikes = await pool.query('UPDATE friendposts SET likes = likes - $1  WHERE id = $2', [1, postid])
        res.json("ok")        
    }

})

router.post("/likepost", async(req,res) => {
    if(req.body.type === null || typeof req.body.type === undefined){
        return res.status(500).json("error")
    }
    else if(req.body.type === 'community'){
        const postid = req.body.id;
        const updateLikedArray = await pool.query('UPDATE groupposts SET likedby = array_append(likedby, $1)  WHERE id = $2', [req.user._id, postid])
        const updateLikes = await pool.query('UPDATE groupposts SET likes = likes + $1  WHERE id = $2', [1, postid])
        res.json("ok")
    }
    else if(req.body.type === "post"){
        const postid = req.body.id;
        const updateLikedArray = await pool.query('UPDATE posts SET likedby = array_append(likedby, $1)  WHERE id = $2', [req.user._id, postid])
        const updateLikes = await pool.query('UPDATE posts SET likes = likes + $1  WHERE id = $2', [1, postid])
        res.json("ok")
    }
    else{
        const postid = req.body.id;
        const updateLikedArray = await pool.query('UPDATE friendposts SET likedby = array_append(likedby, $1)  WHERE id = $2', [req.user._id, postid])
        const updateLikes = await pool.query('UPDATE friendposts SET likes = likes + $1  WHERE id = $2', [1, postid])
        res.json("ok")
    }
  

})

router.post("/getpostbyid", async(req,res) => {
    const type = req.body.type;
    console.log("HIT")
    console.log(type)
    if(type === "community") {
        const postid = req.body.id;
        const arr = await pool.query('SELECT likedby,comments,id,likes,text,title,uploadtime, userid FROM groupposts where id = $1', [postid])
        const obj = arr.rows[0];
        console.log("here")
        if(typeof obj.likedby !== 'undefined'){

            if(obj.likedby.includes(req.user._id)){
                obj.didILike = true;
                return res.json(obj)
            }
            else{
                obj.didILike = false;
                return res.json(obj)
            }
        }
        else{
            res.json("deleted")
        }
        
    }
    else if(type === 'post'){
        const postid = req.body.id;
        console.log("here in post")
        const arr = await pool.query('SELECT likedby,comments,id,likes,text,title,uploadtime, userid FROM posts where id = $1', [postid])
        if(arr.rows.length === 0){
            res.json("")
        }
        else{
            const obj = arr.rows[0];
            if(obj.likedby.includes(req.user._id)){
                obj.didILike = true;
                return res.json(obj)
            }
            else{
                obj.didILike = false;
                return res.json(obj)
            }
        }
      
    }
    else if (type === 'friendposts'){
        const postid = req.body.id;
        console.log("here in friendposts")
        const arr = await pool.query('SELECT likedby,comments,id,likes,text,title,uploadtime, userid FROM friendposts where id = $1', [postid])
        const obj = arr.rows[0];
        console.log(obj)
        if(typeof obj === 'undefined'){
            return res.json("")
        }
        else{
            if(obj.likedby.includes(req.user._id)){
                obj.didILike = true;
                return res.json(obj)
            }
            else{
                obj.didILike = false;
                return res.json(obj)
            }
        }

    }
 
})


router.get("/getCommunities", async(req,res) => {
  
    try {
        const data =await pool.query("SELECT id, groupname, groupimage FROM groups WHERE $1 = ANY(members) ", [req.user._id]);
        return res.status(200).json(data.rows);
    } catch (error) {

       return res.status(500).json(error);
    } 
})


// router.post("/makegroup", async(req,res) => {
//     const user = req.user;
//     if(user){
//         uploadImg(req.files, undefined)
//     }

//     res.json("ok")
// })

router.post("/getsinglegroup", async(req,res) => {
    try {
        const data = await pool.query("SELECT groupname, members, grouptitle, groupdescription, postsid, groupimage FROM groups WHERE id = $1", [req.body.id])
        if(data.rowCount === 0){
            res.status(404).json("undefined")
        }else{
            const obj = {
                groupName: data.rows[0].groupname,
                amIMember: data.rows[0].members.includes(req.user._id),
                groupDescription: data.rows[0].groupdescription,
                postsid: data.rows[0].postsid,
                groupImage: data.rows[0].groupimage,
                groupTitle: data.rows[0].grouptitle
            }
            res.status(200).json(obj);
        }
    } catch (error) {
        res.status(200).json(error);
    }
})


router.post('/groupmakepost', async(req,res) => {
    try {
        const latestData = await pool.query("SELECT * FROM groupposts WHERE userid = $1 ORDER BY id DESC", [req.user._id]);
        const latestPost = latestData.rows[0];
        if(typeof latestPost !== 'undefined'){
            const timeStamp = latestPost.uploadtime;
            const newTime = new Date(timeStamp);
            const today   = new Date();
            const seconds = (today.getTime() - newTime.getTime()) / 1000;
            if(seconds < 100){
                return res.status(406).json("You have created a post in 100 seconds. Please wait a little")
            }

        }
        else{
            const dateObj = new Date();
            const year = dateObj.getFullYear();
            const month = dateObj.getMonth() + 1;
            const day = dateObj.getDate();
            const seconds = dateObj.getSeconds();
            const minutes = dateObj.getMinutes();
            const hour = dateObj.getHours();
            const currentTime = `${year}-${month}-${day} ${hour}:${minutes}:${seconds}`
            const data = await pool.query("INSERT INTO groupposts(groupid, groupname, userid, title, text, uploadtime, commentby,likedby, likes, comments) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [req.body.id, req.body.name,req.user._id, req.body.title, req.body.text, currentTime, [], [], 0,0])
            return res.status(200).json("ok")
        }
      
    } catch (error) {
        console.log("group make error")
        console.log(error)
        return res.status(500).json(error)
    }
})




router.post('/getgroupposts', async(req,res) => {
    try {
        const data = await pool.query("SELECT * FROM groupposts WHERE groupid = $1 ORDER BY id DESC  LIMIT 5", [req.body.id])
        let array = [];
        for(let i = 0; i<data.rows.length; i++){
            const obj = {
                groupname: data.rows[i].groupname,
                id: data.rows[i].id,
                userid: data.rows[i].userid,
                didILike: data.rows[i].likedby.includes(req.user._id),
                title: data.rows[i].title,
                text: data.rows[i].text,
                likes: data.rows[i].likes,
                comments: data.rows[i].comments
            } 
            array.push(obj);
        }
        return res.json(array)
    } catch (error) {

        return res.status(500).json(error)
    }
})


module.exports = router;


