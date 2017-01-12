var gl; // A global variable for the WebGL context
var canvas;

function initialize() {
	gl = initWebGL();
	if (gl) {
	    initShaders();
	}
}


function initWebGL() {
	gl = null;

	canvas = document.createElement("canvas");
	canvas.id = "glcanvas";

	document.body.appendChild(canvas);
	// Try to grab the standard context. If it fails, fallback to experimental.
	gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

	// If we don't have a GL context, give up now
	if (!gl) {
		alert("Unable to initialize WebGL. Your browser may not support it.");
	}

	return gl;
}
function initShaders() {
	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	var theSourceVertex = `
		attribute vec4 aVertexPosition;
		attribute vec2 aTextureCoord;

		uniform float amountWidth;
		uniform float amountHeight;

		varying lowp vec4 vPosition;
		varying lowp vec2 vTexture;
		varying lowp float vAmountWidth;
		varying lowp float vAmountHeight;

		void main(void) {
			gl_Position = aVertexPosition;
			vPosition = aVertexPosition;
			vTexture = aTextureCoord;
			vAmountWidth = amountWidth;
			vAmountHeight = amountHeight;
		}`;
	gl.shaderSource(vertexShader, theSourceVertex);
	gl.compileShader(vertexShader);

	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	var theSourceFragment = `
		varying lowp vec4 vPosition;
		varying lowp vec2 vTexture;
		varying lowp float vAmountWidth;
		varying lowp float vAmountHeight;

		uniform sampler2D uSampler;

	    void main(void) {
	        gl_FragColor = texture2D(uSampler, vec2((gl_FragCoord[0] / vAmountWidth), gl_FragCoord[1] / vAmountHeight));
	        gl_FragColor = vec4(
	        (gl_FragColor[0] * 255.0 + gl_FragColor[0] * 255.0) / 255.0,
	        (gl_FragColor[1] * 255.0 + gl_FragColor[1] * 255.0) / 255.0,
	        (gl_FragColor[2] * 255.0 + gl_FragColor[2] * 255.0) / 255.0,
	        (gl_FragColor[3] * 255.0 + gl_FragColor[3] * 255.0) / 255.0);
	    }`;


	gl.shaderSource(fragmentShader, theSourceFragment);
	gl.compileShader(fragmentShader);
	// Create the shader program

	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	// If creating the shader program failed, alert

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Unable to initialize the shader program: " + gl.getProgramInfoLog(shaderProgram));
	}

	gl.useProgram(shaderProgram);
}

function execute(input, operation) {
	var vertices = [
	-1.0,	1.0,	1.0, 1.0,
	1.0,	1.0,	1.0, 1.0,
	-1.0,	-1.0,	1.0, 1.0,

	1.0, 1.0, 1.0, 1.0,
	1.0,-1.0, 1.0, 1.0,
	-1.0, -1.0, 1.0, 1.0
	];

	var buffer = gl.createBuffer();

	var maxWidth = gl.getParameter(gl.MAX_TEXTURE_SIZE);
	var canvasWidth = input.length;
	var textureHeight = 1;
	if (input.length > maxWidth) {
		textureHeight = Math.floor(input.length / maxWidth) + 1;
		canvasWidth = maxWidth;
	}

	var canvasImg = document.createElement('canvas');
	canvasImg.width = canvas.width = canvasWidth;
	canvasImg.height = canvas.height = textureHeight;

	document.body.appendChild(canvasImg);
	var ctx = canvasImg.getContext('2d');

	var imageData = ctx.getImageData(0,0,canvasImg.width, canvasImg.height);
	var data = imageData.data;

	var data2 = new Uint8Array(data.length);

	for (var i = 0; i < input.length; i++) {
		data2[4*i] = (input[i]>>24) % 256;
		data2[4*i + 1] = (input[i]>>16) % 256;
		data2[4*i + 2] = (input[i]>>8) % 256;
		data2[4*i + 3] = input[i]%256;
	}

	ctx.putImageData(imageData, 0, 0);


	var texture = gl.createTexture();

	gl.bindTexture(gl.TEXTURE_2D, texture);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvasWidth, textureHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, data2);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.uniform1i(gl.getUniformLocation(shaderProgram, 'uSampler'), 0);


	gl.uniform1f(gl.getUniformLocation(shaderProgram, 'amountWidth'), canvasWidth);
	gl.uniform1f(gl.getUniformLocation(shaderProgram, 'amountHeight'), textureHeight);

	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	var vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	gl.enableVertexAttribArray(vertexPositionAttribute);
	gl.vertexAttribPointer(vertexPositionAttribute, 4, gl.FLOAT, false, 0, 0);

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);


	gl.drawArrays(gl.TRIANGLES, 0, 6);


  	var output8 = new Uint8Array(input.length * 4);

	gl.readPixels(0, 0, input.length, 1, gl.RGBA, gl.UNSIGNED_BYTE, output8);


	for (var i = 0; i < output8.length; i+=4) {
		input[i/4] = (output8[i]<<24) + (output8[i + 1]<<16) + (output8[i + 2]<<8) + (output8[i + 3]);
	}

	return input;
}

function getShader(gl, id) {
	var shaderScript = document.getElementById(id);

	// Didn't find an element with the specified ID; abort.

	if (!shaderScript) {
		return null;
	}

	// Walk through the source element's children, building the
	// shader source string.

	var theSource = "";

	var currentChild = shaderScript.firstChild;

	while(currentChild) {
	if (currentChild.nodeType == 3) {
	 	theSource += currentChild.textContent;
	}

	currentChild = currentChild.nextSibling;
	}

	// Now figure out what type of shader script we have,
	// based on its MIME type.

	var shader;

	if (shaderScript.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;  // Unknown shader type
	}

	// Send the source to the shader object

	gl.shaderSource(shader, theSource);

	// Compile the shader program

	gl.compileShader(shader);

	// See if it compiled successfully

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}

var t;
function mainExample() {

	var input1 = [];
	var input2 = [];
	var rnd;
	for (var i = 0; i < 1000000; i++) {
		rnd = Math.floor(Math.random() * 127) + (Math.floor(Math.random() * 127)<<8) + (Math.floor(Math.random() * 127)<<16) + (Math.floor(Math.random() * 10)<<24) ;
		input1.push(rnd);
		input2.push(rnd);
		//input1.push(i % 127);
	}
	console.log(input1[0]);
	// TODO, pass diferents operations to execute
	var operation = "";

	t = new Date();
	initialize();

	var output = execute(input1, operation);

	console.log(new Date() - t, output[0]);

	t = new Date();
	for (var i = 0; i < input2.length; i++) {
		input2[i] = input2[i] * 2;
	}
	console.log(new Date() - t, Math.round(input2[0]));
	setTimeout(function(){
		document.body.innerHTML = "";
		console.log('---');
		mainExample();

	},1000);
}

mainExample();