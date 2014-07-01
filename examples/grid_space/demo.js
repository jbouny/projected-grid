var WINDOW = {
	ms_Width: 0,
	ms_Height: 0,
	ms_Callbacks: {
		70: "WINDOW.toggleFullScreen()"		// Toggle fullscreen
	},
	
	initialize: function initialize() {
		this.updateSize();
		
		// Create callbacks from keyboard
		$(document).keydown(function(inEvent) { WINDOW.callAction(inEvent.keyCode); }) ;
		$(window).resize(function(inEvent) {
			WINDOW.updateSize();
			WINDOW.resizeCallback(WINDOW.ms_Width, WINDOW.ms_Height);
		});
	},
	updateSize: function updateSize() {
		this.ms_Width = $(window).width();
		this.ms_Height = $(window).height() - 4;
	},
	callAction: function callAction(inId) {
		if(inId in this.ms_Callbacks) {
			eval(this.ms_Callbacks[inId]);
			return false ;
		}
	},
	toggleFullScreen: function toggleFullScreen() {
		if(!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement) {
			if(document.documentElement.requestFullscreen)
				document.documentElement.requestFullscreen();
			else if(document.documentElement.mozRequestFullScreen)
				document.documentElement.mozRequestFullScreen();
			else if(document.documentElement.webkitRequestFullscreen)
				document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
		} 
		else  {
			if(document.cancelFullScreen)
				document.cancelFullScreen();
			else if(document.mozCancelFullScreen)
				document.mozCancelFullScreen();
			else if (document.webkitCancelFullScreen)
				document.webkitCancelFullScreen();
		}
	},	
	resizeCallback: function resizeCallback(inWidth, inHeight) {}
};


var ProgramWrapper = function (gl, vertexShader, fragmentShader, attributeLocations) {
	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	for (var attributeName in attributeLocations) {
		gl.bindAttribLocation(program, attributeLocations[attributeName], attributeName);
	}
	gl.linkProgram(program);
	var uniformLocations = {};
	var numberOfUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
	for (var i = 0; i < numberOfUniforms; i += 1) {
		var activeUniform = gl.getActiveUniform(program, i),
			uniformLocation = gl.getUniformLocation(program, activeUniform.name);
		uniformLocations[activeUniform.name] = uniformLocation;
	}

	this.getUniformLocation = function (name) {
		return uniformLocations[name];
	};

	this.getProgram = function () {
		return program;
	}
};

var buildShader = function (gl, type, source) {
	var shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	console.log(gl.getShaderInfoLog(shader));
	return shader;
};

var buildTexture = function (gl, unit, format, type, width, height, data, wrapS, wrapT, minFilter, magFilter) {
	var texture = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0 + unit);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, type, data);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
	return texture;
};

var buildFramebuffer = function (gl, attachment) {
	var framebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, attachment, 0);
	return framebuffer;
};

var DEMO = {
	ms_Canvas: null,
	ms_Renderer: null,
	ms_Camera: null, 
	ms_Scene: null, 
	ms_Controls: null,
	ms_Water: null,

    enable: (function enable() {
        try {
            var aCanvas = document.createElement('canvas');
            return !! window.WebGLRenderingContext && (aCanvas.getContext('webgl') || aCanvas.getContext('experimental-webgl'));
        }
        catch(e) {
            return false;
        }
    })(),
	
	initialize: function initialize( inIdCanvas ) {
		this.ms_Canvas = $( '#' + inIdCanvas );
		
		// Initialize Renderer, Camera and Scene
		this.ms_Renderer = this.enable? new THREE.WebGLRenderer({ antialias: false, logarithmicDepthBuffer: false }) : new THREE.CanvasRenderer();
		this.ms_Canvas.html( this.ms_Renderer.domElement );
		this.ms_Scene = new THREE.Scene();
		
		this.ms_Camera = new THREE.PerspectiveCamera( 55, WINDOW.ms_Width / WINDOW.ms_Height, 0.1, 10000 );
		var scale = 1.0;
		this.ms_Camera.position.set( 10 * scale, 5 * scale, -1 * scale );
		this.ms_Camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );
		
		// Initialize Orbit control		
		this.ms_Controls = new THREE.OrbitControls( this.ms_Camera );
		
		var detailsLevel = 7;
		this.ms_Terrain = new THREE.PlaneGeometry( 1, 1, 1 << detailsLevel, 1 << detailsLevel );

		// Add ocean plane
		this.ms_Material = new THREE.RawShaderMaterial( {
			uniforms: {
				time: { type: "f", value: 1.0 }
			},
			vertexShader: document.getElementById( 'oceanVS' ).textContent,
			fragmentShader: document.getElementById( 'oceanFS' ).textContent,
			side: THREE.DoubleSide,
			wireframe: true
		} );
		
		this.ms_Plane = new THREE.Mesh( this.ms_Terrain, this.ms_Material );
		this.ms_Scene.add( this.ms_Plane );
		
		this.initOcean();
		
		// Add a cubes
		var aCube = new THREE.Mesh( new THREE.BoxGeometry( 5 * scale, 5 * scale, 5 * scale ), new THREE.MeshNormalMaterial() );
		this.ms_Scene.add( aCube );
		
		// Add textured plane
		var material = new THREE.MeshBasicMaterial({
			map: this.ms_InitialSpectrumTexture,
			side: THREE.DoubleSide
		});
		this.ms_TestPlane = new THREE.Mesh( new THREE.PlaneGeometry( 10, 10, 10 ), material );
		this.ms_TestPlane.position.z = 6.0;
		this.ms_Scene.add( this.ms_TestPlane );
	},
	
	initTextureRenderer: function initTextureRenderer( inResolution, inWidth, inHeight, inMaterial ) {
		var renderTargetParams = {
			minFilter: THREE.LinearFilter,
			stencilBuffer: false,
			depthBuffer: false
		};
		
		// Setup render-to-texture scene
		var texture = new THREE.WebGLRenderTarget( inResolution, inResolution, renderTargetParams ); 
		var orthoCamera = new THREE.OrthographicCamera( inWidth / - 2, inWidth / 2, inHeight / 2, inHeight / - 2, -100, 100 );
		var textureGeo = new THREE.PlaneGeometry( inWidth, inHeight );
		var textureMesh = new THREE.Mesh( textureGeo, inMaterial );
		var scene = new THREE.Scene();
		scene.add( textureMesh );
		
		var renderTexture = function() {
			this.ms_Renderer.render( scene, orthoCamera, texture, true );
		}
		
		return [ texture, renderTexture ];
	},
	
	initOcean: function initOcean() {
		this.ms_InitialSpectrumMat = new THREE.RawShaderMaterial( {
			uniforms: {
				time: { type: "f", value: 1.0 },
				resolution: { type: "f", value: 1.0 },
				size: { type: "f", value: 250.0 },
				wind: { type: "v2", value: new THREE.Vector2( 10.0, 10.0 ) },				
				position: { type: "v2", value: new THREE.Vector2( 0, 0 ) }
			},
			vertexShader: document.getElementById( 'fullscreenVS' ).textContent,
			fragmentShader: document.getElementById( 'initialSpectrumFS' ).textContent
		} );
		var initialSpectrumData = this.initTextureRenderer( 10, 10, 10, this.ms_InitialSpectrumMat );
		this.ms_InitialSpectrumTexture = initialSpectrumData[0];
		this.ms_InitialSpectrumRender = initialSpectrumData[1];
		
	},

    display: function display() {
		this.ms_Renderer.render( this.ms_Scene, this.ms_Camera );
	},
	
	update: function update() {
		var time = performance.now() * 0.005;
		
		this.ms_Material.uniforms.time.value = time ;
		this.ms_InitialSpectrumMat.uniforms.time.value = time ;
		this.ms_InitialSpectrumRender();
		
		this.display();
	},
	
	resize: function resize( inWidth, inHeight ) {
		this.ms_Camera.aspect =  inWidth / inHeight;
		this.ms_Camera.updateProjectionMatrix();
		this.ms_Renderer.setSize( inWidth, inHeight );
		this.ms_Canvas.html( this.ms_Renderer.domElement );
		this.display();
	}
};

function mainLoop() {
    requestAnimationFrame(mainLoop);
    DEMO.update();
}

$(function() {
	WINDOW.initialize();
	
	DEMO.initialize('canvas-3d');
	
	WINDOW.resizeCallback = function(inWidth, inHeight) { DEMO.resize(inWidth, inHeight); };
	DEMO.resize(WINDOW.ms_Width, WINDOW.ms_Height);

    mainLoop();
});