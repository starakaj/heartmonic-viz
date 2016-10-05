if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

const brushThickness = 2;
const brushSamples = 14;
const brushTouchdownDistance = 15.0;

var container, stats;
var camera, scene, renderer;
var raycaster;
var quad;

var color1 = {
	h: Math.random(),
	s: Math.random(),
	l: Math.random()
};
var color2 = {
	h: Math.random(),
	s: Math.random(),
	l: Math.random()
};

var mouseX = 0, mouseY = 0;
var mouse = new THREE.Vector2();
var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

var currentMousePoints = null;
var mousePoints = [];
var brushColors = [];
var brushHeights = [];
var brushStrokes = [];

var animations = {};

var params = {
	addRandomCurve : function() {addRandomCurve(800)},
	bpm : 60,
	pulseAffectsSaturation : false,
	pulseMakesStrokes : false,
	saturation : 1.0
};

init();
startGUI();
pulse();
animate();

function init() {

	container = document.getElementById( 'container' );

	camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.z = 100;
	raycaster = new THREE.Raycaster();

	scene = new THREE.Scene();

	var light = new THREE.DirectionalLight( 0xffffff );
	light.position.set( 0, 0, 1 ).normalize();
	scene.add( light );

	var plane = new THREE.PlaneBufferGeometry( window.innerWidth, window.innerHeight );
	var material = new THREE.MeshBasicMaterial({
		color: 0xffeedd,
		wireframe: false,
		transparent: true,
		opacity: 1.0
	});

	quad = new THREE.Mesh( plane, material );
	quad.position.z = -100;
	scene.add( quad );

	randomizeColors();

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.autoClear = false;

	container.appendChild( renderer.domElement );

	stats = new Stats();
	container.appendChild( stats.dom );

	document.addEventListener( 'mousedown', onDocumentMouseDown, false );
	document.addEventListener( 'mousemove', onDocumentMouseMove, false );
	document.addEventListener( 'mouseup', onDocumentMouseUp, false );
	document.addEventListener( 'keydown', onDocumentKeyDown, false );
}

function startGUI() {
	let paramCount = 0;
	for (let p in params) {
		if (params.hasOwnProperty(p))
			paramCount++;
	}
	var gui = new dat.GUI({
		height: 32 * paramCount - 1
	});
	
	gui.add(params, 'addRandomCurve').name("Add Random Brush Stroke");
	gui.add(params, 'bpm').min(30).max(160).name("Heart Rate");

	gui.add(params, 'pulseAffectsSaturation').name("Pulse Affects Saturation").onChange( function() {
		params.saturation = 1.0;
		if (animations["pulseAnimation"])
			delete animations["pulseAnimation"];
	});

	gui.add(params, 'pulseMakesStrokes').name("Pulse Makes Brush Strokes");

	gui.add(params, 'saturation').min(0.0).max(1.0).name("Saturation").onChange( function() {
		brushStrokes.forEach((brushStroke) => {
			let mat = brushStroke.material;
			mat.uniforms.saturation.value = params.saturation;
		});
	});
}

function linscale(x, inmin, inmax, outmin, outmax) {
	let normo = (x - inmin) / (inmax - inmin);
	return normo * (outmax-outmin) + outmin;
}

function makeBrushesOnPulse() {
	let size = linscale(params.bpm, 30, 160, 900, 200);
	let paintCount = Math.floor(linscale(params.bpm, 30, 120, 1, 10));
	for (let i=0; i<paintCount; i++) {
		addRandomCurve(size);
	}
}

function pulse() {
	window.setTimeout( pulse, 60000 / params.bpm );

	if (params.pulseAffectsSaturation) {
		if (animations["pulseAnimation"])
			delete animations["pulseAnimation"];

		animations.pulseAnimation = new Animation({
			duration : Math.min(0.75, 60000 / params.bpm),
			startVal : 1.0,
			targetVal : 0.1,
			onUpdate : function (startVal, targetVal, progress) {
				params.saturation = startVal + progress * (targetVal - startVal);
			}
		});
		animations.pulseAnimation.start();
	}

	if (params.pulseMakesStrokes) {
		makeBrushesOnPulse();
	}
}

function updateAnimations() {
	for (let key in animations) {
		if (animations.hasOwnProperty(key)) {
			let animation = animations[key];
			if (animation.running)
				animation.update();
		}
	}
}

function lerpColor(c1, c2, mx) {
	return {
		r: ((1-mx) * c1.r + mx * c2.r),
		y: ((1-mx) * c1.y + mx * c2.y),
		b: ((1-mx) * c1.b + mx * c2.b)
	}
}

function randomizeColors() {
	color1 = {
		r: Math.random(),
		y: Math.random(),
		b: Math.random()
	};
	color2 = {
		r: Math.random(),
		y: Math.random(),
		b: Math.random()
	};
}

function makeBrush() {
	brushColors = [];
	brushHeights = [];
	let ryb = new RgbRyb()
	for (let i=0; i<brushSamples; ++i) {
		let col = lerpColor(color1, color2, Math.random());
		ryb.setRyb( Math.floor(255 * col.r), Math.floor(255 * col.y), Math.floor(255 * col.b));
		let brushColor = new THREE.Color( ryb.getRgbText() );
		brushColors.push( brushColor );
		let brushHeight = Math.random();
		brushHeights.push(brushHeight);
	}
	let brushMin = Math.min.apply(null, brushHeights);
	let brushMax = Math.max.apply(null, brushHeights);
	brushHeights = brushHeights.map(x => {
		return (x-brushMin) / (brushMax - brushMin);
	});
}

function windowPointToScenePoint( pt ) {
	let mx = new THREE.Vector2();
	mx.x = ( pt.x / window.innerWidth ) * 2 - 1;
	mx.y = - ( pt.y / window.innerHeight ) * 2 + 1;
	raycaster.setFromCamera( mx, camera );
	let intersects = raycaster.intersectObject( quad );
	if ( intersects.length ) {
		return intersects[0].point;
	}
}

function handleNewMouseEvent( event ) {
	mouse.x = event.clientX;
	mouse.y = event.clientY;
	let pt = windowPointToScenePoint(mouse);
	if (pt) {
		mousePoints.push(pt);
	}
}

function onDocumentMouseDown( event ) {
	mousePoints = [];
	handleNewMouseEvent( event );
}

function onDocumentMouseMove( event ) {
	handleNewMouseEvent( event );
}

function onDocumentKeyDown( event ) {
	if (event.code === "Space") {
		randomizeColors();
	} else if (event.code === "KeyC") {
		brushStrokes.forEach(function (c) {
			scene.remove(c);
		});
		brushStrokes = [];
	}
}

function makeLineVertices( startPoint, endPoint, inbetweens ) {
	let outVertices = [];
	for (let i=0; i<(2+inbetweens); i++) {
		let p = i / (1+inbetweens);
		let px = (1-p)*startPoint.x + p*endPoint.x;
		let py = (1-p)*startPoint.y + p*endPoint.y;
		let pz = (1-p)*startPoint.z + p*endPoint.z;
		outVertices.push(new THREE.Vector3(px, py, pz));
	}
	return outVertices;
}

function makeStripFaces( indexStart, indexEnd, indexCount ) {
	let outFaces = [];
	for (let i=0; i<indexCount-1; i++) {
		let face1 = new THREE.Face3( i+indexStart, i+indexStart+1, i+indexEnd );
		let face2 = new THREE.Face3( i+indexStart+1, i+indexEnd+1, i+indexEnd );
		outFaces.push(face1);
		outFaces.push(face2);
	}
	return outFaces;
}

function colorForVertexAtIndex( idx ) {
	let brushIndex = idx % brushSamples;
	return brushColors[ brushIndex ];
}

function heightForVertexAtIndex( idx ) {
	let brushIndex = idx % brushSamples;
	return brushHeights[ brushIndex ];
}

function addFacesToVertexBuffer( vertexBuffer, bufferOffset, previousStrip, currentStrip ) {
	const vertexIndices = [ 'x', 'y', 'z' ];
	for (let i=0; i<previousStrip.length-1; i++) {
		let voffset = bufferOffset + (i * 2 * 3 * 3);
		let pa = previousStrip[i];
		let pb = previousStrip[i+1];
		let pc = currentStrip[i];
		let pd = currentStrip[i+1];

		// Add the first face
		for (let j=0; j<3; j++) {
			vertexBuffer[voffset + (0 * 3) + j] = pa[ vertexIndices[j] ];
			vertexBuffer[voffset + (1 * 3) + j] = pb[ vertexIndices[j] ];
			vertexBuffer[voffset + (2 * 3) + j] = pc[ vertexIndices[j] ];
		}

		// Add the second face
		voffset += (3 * 3);
		for (let j=0; j<3; j++) {
			vertexBuffer[voffset + (0 * 3) + j] = pd[ vertexIndices[j] ];
			vertexBuffer[voffset + (1 * 3) + j] = pc[ vertexIndices[j] ];
			vertexBuffer[voffset + (2 * 3) + j] = pb[ vertexIndices[j] ];
		}
	}
}

function addColorsToColorBuffer( colorBuffer, bufferOffset, pressure, previousStrip, currentStrip ) {
	const colorIndices = [ 'r', 'g', 'b', 'a' ];
	for (let i=0; i<previousStrip.length-1; i++) {
		let voffset = bufferOffset + (i * 2 * 3 * 4);
		let color1 = colorForVertexAtIndex(i);
		let color2 = colorForVertexAtIndex(i+1);
		let height1 = heightForVertexAtIndex(i);
		let height2 = heightForVertexAtIndex(i+1);
		color1.a = Math.min(1.0, Math.max(0.0, (1.0 - Math.max(0.0, (height1 - pressure)))));
		color2.a = Math.min(1.0, Math.max(0.0, (1.0 - Math.max(0.0, (height2 - pressure)))));
		for (let j=0; j<4; j++) {
			colorBuffer[voffset + (0 * 4) + j] = color1[ colorIndices[j] ];
			colorBuffer[voffset + (1 * 4) + j] = color2[ colorIndices[j] ];
			colorBuffer[voffset + (2 * 4) + j] = color1[ colorIndices[j] ];
		}

		voffset += (3 * 4);
		for (let j=0; j<4; j++) {
			colorBuffer[voffset + (0 * 4) + j] = color2[ colorIndices[j] ];
			colorBuffer[voffset + (1 * 4) + j] = color1[ colorIndices[j] ];
			colorBuffer[voffset + (2 * 4) + j] = color2[ colorIndices[j] ];
		}
	}
}

function makePointsAlongCurve( p1, p2, p3 ) {
	let bez = new Bezier( p1, p2, p3 );
	let lut = bez.getLUT(100);
	let outPoints = [];
	lut.forEach(p => {
		outPoints.push({
			x : p.x,
			y : p.y
		});
	});
	return outPoints;
}

function addRandomCurve( size ) {
	let points = [];
	let midpoint = {
		x : Math.random() * (window.innerWidth - size) + size/2,
		y : Math.random() * (window.innerHeight - size) + size/2,
	}
	for (let i=0; i<3; i++) {
		points.push({
			x : midpoint.x + Math.random() * size - size/2,
			y : midpoint.y + Math.random() * size - size/2
		});
	}
	let curvePoints = makePointsAlongCurve(...points);
	let lineGeometry = new THREE.Geometry();
	curvePoints.forEach(p => {
		let pt = windowPointToScenePoint(p);
		if (pt)
			lineGeometry.vertices.push( new THREE.Vector3(pt.x, pt.y, -100) );
	});
	addNewBrushStroke( lineGeometry );
}

function addNewBrushStroke( lineGeometry ) {
	// Go through and try to define a shape that's an outline of the line
	let leftLineGeometry = new THREE.Geometry();
	let rightLineGeometry = new THREE.Geometry();
	for (let i=0; i<lineGeometry.vertices.length-2; i++) {
		let pt = lineGeometry.vertices[i];
		let nextPt = lineGeometry.vertices[i+1];
		let pressure = Math.min(5.0, Math.max(1.0, Math.min(Math.abs(-i/brushTouchdownDistance), Math.abs((lineGeometry.vertices.length-2-i)/brushTouchdownDistance))));
		pressure = 1.0 + (pressure - 1.0) / 5;
		let dy = nextPt.y - pt.y;
		let dx = nextPt.x - pt.x;
		let ang = Math.atan2(dy, dx);
		let perpAngLeft = ang + Math.PI/2;
		let perpAngRight = ang - Math.PI/2;
		leftLineGeometry.vertices.push(new THREE.Vector3( 
			pt.x + pressure * brushThickness * Math.cos(perpAngLeft),
			pt.y + pressure * brushThickness * Math.sin(perpAngLeft),
			-100)
		);
		rightLineGeometry.vertices.push(new THREE.Vector3( 
			pt.x + pressure * brushThickness * Math.cos(perpAngRight),
			pt.y + pressure * brushThickness * Math.sin(perpAngRight),
			-100)
		);
	}

	// Now, actually make the ribbon shape
	makeBrush();
	let inbetweens = brushSamples - 2;
	let verticesPerStrip =  brushSamples;
	let strokeGeometry = new THREE.BufferGeometry();
	let previousStripVertices = [];
	let brushVertexBuffer = new Float32Array((2 * 3 * 3) * (verticesPerStrip - 1) * (leftLineGeometry.vertices.length - 1));
	let brushColors = new Float32Array((2 * 3 * 4) * (verticesPerStrip - 1) * (leftLineGeometry.vertices.length - 1));

	const faceIndices = [ 'a', 'b', 'c' ];
	let brushVertexAttributes = [];
	for (let i=0; i<leftLineGeometry.vertices.length; i++) {


		let pressure = Math.min(1.0, Math.min(Math.abs(-i/brushTouchdownDistance), Math.abs((leftLineGeometry.vertices.length-i)/brushTouchdownDistance)));

		// Make a bunch of vertexes connecting the two points
		let stripVertices = makeLineVertices(leftLineGeometry.vertices[i], rightLineGeometry.vertices[i], inbetweens);
		if (i > 0) {
			let bufferOffset = i * (2 * 3 * 3) * (verticesPerStrip - 1);
			addFacesToVertexBuffer( brushVertexBuffer, bufferOffset, previousStripVertices, stripVertices );
			bufferOffset = i * (2 * 3 * 4) * (verticesPerStrip - 1);
			addColorsToColorBuffer( brushColors, bufferOffset, pressure, previousStripVertices, stripVertices );
		}
		previousStripVertices = stripVertices;
	}
	strokeGeometry.addAttribute( 'position', new THREE.BufferAttribute( brushVertexBuffer, 3 ) );
	strokeGeometry.addAttribute( 'color', new THREE.BufferAttribute( brushColors, 4 ) );
	let brushMaterial = new THREE.ShaderMaterial({
		vertexShader: document.getElementById("brush-vertex-shader").text,
		fragmentShader: document.getElementById("brush-fragment-shader").text,
		uniforms: { 
			saturation: { value : params.saturation }
		},
		transparent: true
	});
	let brushStroke = new THREE.Mesh( strokeGeometry, brushMaterial );
	scene.add( brushStroke );
	brushStrokes.push( brushStroke );
	if (brushStrokes.length > 100) {
		scene.remove(brushStrokes[0]);
		brushStrokes.splice(0, 1);
	}
}

function onDocumentMouseUp( event ) {
	handleNewMouseEvent( event );

	if (mousePoints.length < 4)
		return;

	let lineGeometry = new THREE.Geometry();
	for (let i=0; i<mousePoints.length; i++) {
		let mEvent = mousePoints[i];
		lineGeometry.vertices.push(new THREE.Vector3( mEvent.x, mEvent.y, -100));
	}

	addNewBrushStroke( lineGeometry );
}

function animate() {
	requestAnimationFrame( animate );
	updateAnimations();
	render();
	stats.update();
}

function render() {

	brushStrokes.forEach((brushStroke) => {
		let mat = brushStroke.material;
		mat.uniforms.saturation.value = params.saturation;
	});

	camera.lookAt( scene.position );
	renderer.clear();
	renderer.render( scene, camera );

}
