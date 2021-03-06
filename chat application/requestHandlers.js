var exec = require("child_process").exec,
	querystring = require("querystring"),
	fs = require("fs"),
	path = require("path"),
   // http = require('http'),
   mysql = require("mysql"),
    connection = mysql.createConnection({
        user: "root",
        password: "",
        database: "chat_db"
    }),
    userName = "";

function login(response, postData,request) {
    
	if (postData === null || postData === undefined || postData === "") {
	    getFile(response, "login.htm");
	}
	else {
	    
	    connection.query("SELECT * FROM user_information WHERE user_id = '" + querystring.parse(postData).user_name + "' AND user_pass = '" + querystring.parse(postData).user_pass + "';",
            function (error, rows, fields) {
                
                /*  response.writeHead(200, {
                      "Content-Type": "text/plain",
                      'Access-Control-Allow-Origin' : '*'
                  });*/
                if (rows.length > 0) {
                    console.log('allow to chat');
                    userName = rows[0]['user_id'];
                    response.statusCode = 302;
                    response.setHeader("Location", "/chat");
                    response.end();

                }

                else {
                    getFile(response, "invalid_login.html");
                }
            });
	}
	    
}
function getContentType(ext) {
    var validExtensions = {
        ".html": "text/html",
        ".htm": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".txt": "text/plain",
        ".jpg": "image/jpeg",
        ".gif": "image/gif",
        ".png": "image/png"
    };
    return validExtensions[ext];
}
function getFile(response ,filename) {
    //var filename = "login.htm",
     var ext = path.extname(filename);

    var localPath = "./";
    

    if (getContentType(ext)) {
        localPath += filename;
        path.exists(localPath, function (exists) {
            if (exists) {
                //console.log("Serving file: " + localPath);
                // getFile(localPath, response, validExtensions[ext]);
                fs.readFile(localPath, function (err, contents) {
                    if (!err) {
                        response.setHeader("Content-Length", contents.length);
                        response.setHeader("Content-Type", getContentType(ext));
                        response.statusCode = 200;
                        response.end(contents);
                    } else {
                        response.writeHead(500);
                        response.end();
                    }
                });

            } else {
                console.log("File not found: " + localPath);
                response.writeHead(404);
                response.end();
            }
        });

    } else {
        console.log("Invalid file extension detected: " + ext)
    }

	
}

function chat(response, postData,request) {
    var query = require('url').parse(request.url, true).query;
    
    fs.readFile("client.html", 'utf-8', function (error, data) {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.write(data);
        response.end();
    });
    /*
    var io = require('socket.io').listen(app);
    console.log('inisde main');
    io.sockets.on('connection', function (socket) {
        //console.log('before');
        //console.log(socket.id);

        //console.log('afteer');

        socket.on('message_to_server', function (data) {
            io.sockets.emit("message_to_client", { message: data["message"] });
            //this.emit("message_to_client",{ message: data["message"] });
        });
    });*/

}
function addSocketInfoToDatabase(user,socketid,io) {
    connection.query("UPDATE user_information SET socket_id = '" + socketid + "' WHERE user_id = '" + user + "';");
    connection.query("UPDATE user_information SET online = '" + 0 + "' WHERE user_id = '" + user + "';");
    updateOfflineMessages(user, socketid,io);
}
/**
* Updates the offline messages of the user
*/
function updateOfflineMessages(user, socketid,io) {
    connection.query("SELECT * FROM offline_messages WHERE user_id = '" + user + "';", function (error, rows, fields) {
        if (rows.length > 0) {
            for (var i = 0; i < rows.length; i++) {
                if (io.sockets.connected[socketid]) {
                    io.sockets.connected[socketid].emit("message_to_client", { message: rows[i]["message"], clientName: rows[i]["friend_id"] });
                }
            }
        }
    });
    deleteOfflineMessages(user);
}
/**
* Deletes the previously stored offline messages of the passed user
*/
function deleteOfflineMessages(user) {
    connection.query("DELETE FROM offline_messages WHERE user_id = '" + user + "';");
}

function upload(response,postData) {
	console.log('Request handler for upload called');
	response.writeHead(200,{"Content-type":"text/plain"});
	response.write("You had sent:" +querystring.parse(postData).text);
	response.end();
}

function getUser(response) {
   
    response.writeHead(200, { "Content-type": "text/plain" });
    response.write(userName);
    response.end();
}
function getUsers(response) {

    response.writeHead(200, { "Content-type": "text/plain" });
    connection.query("SELECT user_id FROM user_information;",
            function (error, rows, fields) {

                response.write(JSON.stringify(rows));
                response.end();
               
            });
    
}

function sendMessage(data, io) {
    var callback = function (error, rows, fields) {

        /*  response.writeHead(200, {
        "Content-Type": "text/plain",
        'Access-Control-Allow-Origin' : '*'
        });*/
        if (rows.length > 0) {

            var socketid = rows[0]['socket_id'];
            if (io.sockets.connected[socketid]) {
                io.sockets.connected[socketid].emit("message_to_client", { message: data["message"], clientName: data["clientName"] });
            } else {
                // The user if offline store his messages
                console.log("client name is :" + data["clientName"]);
                connection.query("INSERT INTO offline_messages  (user_id,friend_id,message) VALUES ('" + data["friend"] + "','" + data["clientName"] +"','" + data["message"] + "');");
                /*                                                                                     
                connection.query("SELECT message FROM offline_messages WHERE user_id = '" + data["friend"] + "';", function (error, rows, fields) {
                if (rows.length > 0) {
                console.log('going in the correct place');
                jsonObj = JSON.parse(rows[0]['message']);
                message.message = data["message"];
                message.sentBy = data["clientName"];
                jsonObj.push(message);
                //connection.query("UPDATE offline_messages SET message = '" + data["message"] + "' WHERE user_id = '" + data["friend"] + "';");
                connection.query("UPDATE offline_messages SET message = '" + JSON.stringify(jsonObj) + "' WHERE user_id = '" + data["friend"] +                                         "';");
                }
                });
                */

            }

        }

        else {
            //getFile(response, "invalid_login.html");
            console.log('no socket');
        }
    };
   // console.log('------------db query --------------');
    connection.query("SELECT socket_id FROM user_information WHERE user_id = '" + data["friend"] + "';", callback);



}



exports.login = login;
exports.chat = chat;
exports.getUser = getUser;
exports.getUsers = getUsers;
exports.addSocketInfoToDatabase = addSocketInfoToDatabase;
exports.sendMessage = sendMessage;