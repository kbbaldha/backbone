function route(handle,pathname,response,postData,request) {
    console.log('route called');
    console.log('handle:' + handle + 'pathname:' + pathname + 'response:' + response + 'postData:' + postData);
	if (typeof handle[pathname] === 'function') {
		handle[pathname](response,postData,request);
	} else {
		console.log('No such file found');
		response.writeHead(404,{"Content-type":"text/plain"});
		response.write("404 File Not Found");
		response.end();
	}
	
}

exports.route = route;