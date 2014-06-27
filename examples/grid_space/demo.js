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
		this.ms_Renderer = this.enable? new THREE.WebGLRenderer() : new THREE.CanvasRenderer();
		this.ms_Canvas.html( this.ms_Renderer.domElement );
		this.ms_Scene = new THREE.Scene();
		
		this.ms_Camera = new THREE.PerspectiveCamera( 55, WINDOW.ms_Width / WINDOW.ms_Height, 0.00001, 3000000 );
		this.ms_Camera.position.set( 100, 50, -100 );
		this.ms_Camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );
		
		// Initialize Orbit control		
		this.ms_Controls = new THREE.OrbitControls( this.ms_Camera );
		
		var detailsLevel = 8;
		this.ms_Terrain = new THREE.PlaneGeometry( 1, 1, 1 << detailsLevel, 1 << detailsLevel );

		this.ms_Material = new THREE.RawShaderMaterial( {
			uniforms: {
				time: { type: "f", value: 1.0 }
			},
			vertexShader: document.getElementById( 'vertexShader' ).textContent,
			fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
			side: THREE.DoubleSide,
			wireframe: true
		} );
		
		this.ms_Plane = new THREE.Mesh( this.ms_Terrain, this.ms_Material );
		this.ms_Scene.add( this.ms_Plane );
	},

    display: function display() {
		this.ms_Renderer.render( this.ms_Scene, this.ms_Camera );
	},
	
	update: function update() {
		var time = performance.now();
		
		this.ms_Material.uniforms.time.value = time * 0.005 ;
		
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