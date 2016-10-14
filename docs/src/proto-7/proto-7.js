if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

const brushThickness = 3;
const bristleCount = 18;
const brushMultisampling = 2;
const brushTouchdownDistance = 8.0;
const bristleMinimumDistance = 0.05;

var container, stats;
var camera, scene, renderer, time = 0, backgroundMaterial;
var raycaster;
var quad;
var heightRenderTarget;
var LightPosition_worldspace = new THREE.Vector3( 0, 0, 0 );

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
	backgroundColor : [255, 238, 221],
	lightingEnabled : false,
	lightX : 0,
	lightY : 0,
	lightZ : -5,
	lightColor : [255, 255, 195],
	diffuseStrength : 6000,
	specularStrength : 60,
	paintColor1 : [0, 0, 0],
	paintColor2 : [0, 0, 0],
	brushColorVariety : 0.5,
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
	backgroundMaterial = new THREE.MeshBasicMaterial({
		color: 0xffeedd,
		wireframe: false,
		transparent: true,
		opacity: 1.0
	});

	quad = new THREE.Mesh( plane, backgroundMaterial );
	quad.position.z = -100;
	scene.add( quad );

	heightRenderTarget = new THREE.WebGLRenderTarget( 
		window.innerWidth, 
		window.innerHeight, 
		{ minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBFormat }
	);

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

	var lf = gui.addFolder("Lighting");
	lf.add(params, 'lightingEnabled');
	lf.add(params, 'lightX').min(-100).max(100);
	lf.add(params, 'lightY').min(-100).max(100);
	lf.add(params, 'lightZ').min(-100).max(0);
	lf.add(params, 'diffuseStrength').min(50).max(10000);
	lf.add(params, 'specularStrength').min(20).max(10000);
	lf.addColor(params, 'lightColor');

	var pf = gui.addFolder("Paint");
	pf.addColor(params, 'paintColor1').listen();
	pf.addColor(params, 'paintColor2').listen();
	pf.addColor(params, 'backgroundColor');
	pf.add(params, 'brushColorVariety').min(0).max(10);
	pf.open;

	var hf = gui.addFolder("Heart Rate");
	hf.add(params, 'bpm').min(30).max(160).name("Heart Rate");
	hf.add(params, 'pulseAffectsSaturation').name("Saturation").onChange( function() {
		params.saturation = 1.0;
		if (animations["pulseAnimation"])
			delete animations["pulseAnimation"];
	});
	hf.add(params, 'pulseMakesStrokes').name("Brush Strokes");

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
	return [
		((1-mx) * c1[0] + mx * c2[0]),
		((1-mx) * c1[1] + mx * c2[1]),
		((1-mx) * c1[2] + mx * c2[2])
	];
}

function randomizeColors() {
	params.paintColor1 = [
		255 * Math.random(),
		255 * Math.random(),
		255 * Math.random()
	];
	params.paintColor2 = [
		255 * Math.random(),
		255 * Math.random(),
		255 * Math.random()
	];
}

function makeBrush() {
	brushColors = [];
	brushHeights = [];
	noise.seed(Math.random());
	let dy = Math.random();
	let ryb = new RgbRyb();

	for (let i=0; i<bristleCount; ++i) {
		let lfrac = noise.simplex2( i/(bristleCount-1) * params.brushColorVariety, dy);
		lfrac = (lfrac + 1) / 2;
		console.log(lfrac);
		let col = lerpColor(params.paintColor1, params.paintColor2, lfrac);
		ryb.setRyb( col[0], col[1], col[2] );
		let brushColor = new THREE.Color( ryb.getRgbText() );
		brushColors.push( brushColor );
		let brushHeight = Math.random() * (i===0 || i === (bristleCount - 1) ? 0.6 : 1.0);
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

function makeLineVertices( startPoint, endPoint, targetVertexCount ) {
	let outVertices = [];
	for (let i=0; i<targetVertexCount; i++) {
		let p = i / (targetVertexCount - 1);
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

function colorForVertexAtIndex( idx, verticesPerStrip ) {
	let brushDist = (idx % verticesPerStrip) / verticesPerStrip;
	let brushNear = Math.floor(brushDist * bristleCount);
	let brushFar = brushNear + 1;
	let brushInterp = brushDist * bristleCount - brushNear;
	if (brushFar >= bristleCount) {
		return new THREE.Color().copy( brushColors[ brushNear ] );
	} else {
		return new THREE.Color(
			(1 - brushInterp) * brushColors[ brushNear ].r + brushInterp * brushColors[ brushFar ].r,
			(1 - brushInterp) * brushColors[ brushNear ].g + brushInterp * brushColors[ brushFar ].g,
			(1 - brushInterp) * brushColors[ brushNear ].b + brushInterp * brushColors[ brushFar ].b
		);
	}
}

function heightForVertexAtIndex( idx, verticesPerStrip ) {
	let brushDist = (idx % verticesPerStrip) / verticesPerStrip;
	let brushNear = Math.floor(brushDist * bristleCount);
	let brushFar = brushNear + 1;
	let brushInterp = brushDist * bristleCount - brushNear;
	let dy = Math.floor( idx / verticesPerStrip );

	let outVal;
	if (brushFar >= bristleCount) {
		outVal = brushHeights[ brushNear ];
	} else {
		outVal = (1 - brushInterp) * brushHeights[ brushNear ] + brushInterp * brushHeights[ brushFar ];
	}

	return (outVal + 0.1 * noise.simplex2( brushDist, dy ));
}

function addFacesToVertexBuffer( vertexBuffer, bufferOffset, previousStrip, currentStrip, vertexOffset, normalBuffer ) {
	const vertexIndices = [ 'x', 'y', 'z' ];
	let lowerPrevious = null;
	let upperPrevious = null;

	// This is simply a tangent to the line containing all of the points, projected onto the XY plane
	let lowerLaggingPoint = previousStrip[0];
	let lowerLeadingPoint = previousStrip[previousStrip.length-1];
	let lowerPlanePerpendicular = new THREE.Vector3(
		lowerLeadingPoint.y - lowerLaggingPoint.y,
		lowerLaggingPoint.x - lowerLeadingPoint.x,
		0
	);
	let upperLaggingPoint = currentStrip[0];
	let upperLeadingPoint = currentStrip[currentStrip.length-1];
	let upperPlanePerpendicular = new THREE.Vector3(
		upperLeadingPoint.y - upperLaggingPoint.y,
		upperLaggingPoint.x - upperLeadingPoint.x,
		0
	);

	for (let i=0; i<previousStrip.length-1; i++) {
		let voffset = bufferOffset + (i * 2 * 3 * 3);
		let vstart = i + vertexOffset;
		let vertexCount = previousStrip.length;

		let pa = previousStrip[i];
		let pb = previousStrip[i+1];
		let pb_plus = (i < previousStrip.length - 2) ? previousStrip[i+2] : previousStrip[i+1];
		let pc = currentStrip[i];
		let pd = currentStrip[i+1];
		let pd_plus = (i < currentStrip.length - 2) ? currentStrip[i+2] : currentStrip[i+1];

		let m = 1;
		let ha = m * heightForVertexAtIndex(vstart - vertexCount, vertexCount);
		let hb = m * heightForVertexAtIndex(vstart + 1 - vertexCount, vertexCount);
		let hb_plus = m * heightForVertexAtIndex(vstart + 2 - vertexCount, vertexCount);
		let hc = m * heightForVertexAtIndex(vstart, vertexCount);
		let hd = m * heightForVertexAtIndex(vstart + 1, vertexCount);
		let hd_plus = m * heightForVertexAtIndex(vstart + 2, vertexCount);

		let pa_normal, pb_normal, pc_normal, pd_normal;

		if (lowerPrevious === null)
			lowerPrevious = pa;
		if (upperPrevious === null)
			upperPrevious = pc;

		// Calculate normals
		if (lowerPrevious !== null) {
			let lowerPreviousTangent = new THREE.Vector3 (
				pa.x - lowerPrevious.x,
				pa.y - lowerPrevious.y,
				ha - lowerPrevious.z
			);
			let lowerCurrentTangent = new THREE.Vector3 (
				pb.x - pa.x,
				pb.y - pa.y,
				hb - ha
			);
			let lowerNextTangent = new THREE.Vector3 (
				pb_plus.x - pb.x,
				pb_plus.y - pb.y,
				hb_plus - hb
			);

			let mean_tan_a = new THREE.Vector3 (
				(lowerCurrentTangent.x + lowerPreviousTangent.x) / 2,
				(lowerCurrentTangent.y + lowerPreviousTangent.y) / 2,
				(lowerCurrentTangent.z + lowerPreviousTangent.z) / 2
			);
			let mean_tan_b = new THREE.Vector3 (
				(lowerNextTangent.x + lowerCurrentTangent.x) / 2,
				(lowerNextTangent.y + lowerCurrentTangent.y) / 2,
				(lowerNextTangent.z + lowerCurrentTangent.z) / 2
			);

			pa_normal = new THREE.Vector3().crossVectors( lowerPlanePerpendicular, mean_tan_a ).normalize();
			pb_normal = new THREE.Vector3().crossVectors( lowerPlanePerpendicular, mean_tan_b ).normalize();
		}

		// Calculate normals
		if (upperPrevious !== null) {
			let upperPreviousTangent = new THREE.Vector3 (
				pc.x - upperPrevious.x,
				pc.y - upperPrevious.y,
				hc - upperPrevious.z
			);
			let upperCurrentTangent = new THREE.Vector3 (
				pd.x - pc.x,
				pd.y - pc.y,
				hd - hc
			);
			let upperNextTangent = new THREE.Vector3 (
				pd_plus.x - pd.x,
				pd_plus.y - pd.y,
				hd_plus - hd
			);

			let mean_tan_c = new THREE.Vector3 (
				(upperCurrentTangent.x + upperPreviousTangent.x) / 2,
				(upperCurrentTangent.y + upperPreviousTangent.y) / 2,
				(upperCurrentTangent.z + upperPreviousTangent.z) / 2
			);
			let mean_tan_d = new THREE.Vector3 (
				(upperNextTangent.x + upperCurrentTangent.x) / 2,
				(upperNextTangent.y + upperCurrentTangent.y) / 2,
				(upperNextTangent.z + upperCurrentTangent.z) / 2
			);

			pc_normal = new THREE.Vector3().crossVectors( upperPlanePerpendicular, mean_tan_c ).normalize();
			pd_normal = new THREE.Vector3().crossVectors( upperPlanePerpendicular, mean_tan_d ).normalize();
		}

		// Add the first face
		for (let j=0; j<3; j++) {
			vertexBuffer[voffset + (0 * 3) + j] = pa[ vertexIndices[j] ];
			vertexBuffer[voffset + (1 * 3) + j] = pb[ vertexIndices[j] ];
			vertexBuffer[voffset + (2 * 3) + j] = pc[ vertexIndices[j] ];
			normalBuffer[voffset + (0 * 3) + j] = pa_normal[ vertexIndices[j] ];
			normalBuffer[voffset + (1 * 3) + j] = pb_normal[ vertexIndices[j] ];
			normalBuffer[voffset + (2 * 3) + j] = pc_normal[ vertexIndices[j] ];
		}

		// Add the second face
		voffset += (3 * 3);
		for (let j=0; j<3; j++) {
			vertexBuffer[voffset + (0 * 3) + j] = pd[ vertexIndices[j] ];
			vertexBuffer[voffset + (1 * 3) + j] = pc[ vertexIndices[j] ];
			vertexBuffer[voffset + (2 * 3) + j] = pb[ vertexIndices[j] ];
			normalBuffer[voffset + (0 * 3) + j] = pd_normal[ vertexIndices[j] ];
			normalBuffer[voffset + (1 * 3) + j] = pc_normal[ vertexIndices[j] ];
			normalBuffer[voffset + (2 * 3) + j] = pb_normal[ vertexIndices[j] ];
		}

		lowerPrevious = new THREE.Vector3().copy(pa).setZ(ha);
		upperPrevious = new THREE.Vector3().copy(pc).setZ(hc);
	}
}

function addColorsToColorBuffer( colorBuffer, bufferOffset, previousPressure, currentPressure, vertexCount, vertexOffset ) {
	const colorIndices = [ 'r', 'g', 'b', 'a' ];
	for (let i=0; i<vertexCount-1; i++) {
		let voffset = bufferOffset + (i * 2 * 3 * 4);
		let vstart = i + vertexOffset;
		let ca = colorForVertexAtIndex(vstart - vertexCount, vertexCount);
		let cb = colorForVertexAtIndex(vstart + 1 - vertexCount, vertexCount);
		let cc = colorForVertexAtIndex(vstart, vertexCount);
		let cd = colorForVertexAtIndex(vstart + 1, vertexCount);
		let ha = heightForVertexAtIndex(vstart - vertexCount, vertexCount);
		let hb = heightForVertexAtIndex(vstart + 1 - vertexCount, vertexCount);
		let hc = heightForVertexAtIndex(vstart, vertexCount);
		let hd = heightForVertexAtIndex(vstart + 1, vertexCount);

		let colors = [ca, cb, cc, cd];
		let heights = [ha, hb, hc, hd];
		let pressures = [previousPressure, previousPressure, currentPressure, currentPressure];

		for (let j=0; j<4; j++) {
			let distance = heights[j] - pressures[j];

			// If the bristle is too far from the canvas, then it doesn't draw any color at all
			if (distance > bristleMinimumDistance)
				colors[j].a = 0;
			else
				colors[j].a = (distance > 0 ? (distance / bristleMinimumDistance) : 1);
		}

		for (let j=0; j<4; j++) {
			colorBuffer[voffset + (0 * 4) + j] = ca[ colorIndices[j] ];
			colorBuffer[voffset + (1 * 4) + j] = cb[ colorIndices[j] ];
			colorBuffer[voffset + (2 * 4) + j] = cc[ colorIndices[j] ];
		}

		voffset += (3 * 4);
		for (let j=0; j<4; j++) {
			colorBuffer[voffset + (0 * 4) + j] = cd[ colorIndices[j] ];
			colorBuffer[voffset + (1 * 4) + j] = cc[ colorIndices[j] ];
			colorBuffer[voffset + (2 * 4) + j] = cb[ colorIndices[j] ];
		}
	}
}

function addHeightsToHeightBuffer( heightBuffer, bufferOffset, previousPressure, currentPressure, vertexCount, vertexOffset ) {
	const attributeSize = 1;
	for (let i=0; i<vertexCount-1; i++) {
		let voffset = bufferOffset + (i * 2 * 3 * attributeSize);
		let vstart = i + vertexOffset;
		let ha = heightForVertexAtIndex(vstart - vertexCount, vertexCount);
		let hb = heightForVertexAtIndex(vstart + 1 - vertexCount, vertexCount);
		let hc = heightForVertexAtIndex(vstart, vertexCount);
		let hd = heightForVertexAtIndex(vstart + 1, vertexCount);
		for (let j=0; j<attributeSize; j++) {
			heightBuffer[voffset + (0 * attributeSize) + j] = ha;
			heightBuffer[voffset + (1 * attributeSize) + j] = hb;
			heightBuffer[voffset + (2 * attributeSize) + j] = hc;
		}

		voffset += (3 * attributeSize);
		for (let j=0; j<attributeSize; j++) {
			heightBuffer[voffset + (0 * attributeSize) + j] = hd;
			heightBuffer[voffset + (1 * attributeSize) + j] = hc;
			heightBuffer[voffset + (2 * attributeSize) + j] = hb;
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
	let verticesPerStrip =  bristleCount * brushMultisampling;
	let inbetweens = verticesPerStrip - 2;
	let strokeGeometry = new THREE.BufferGeometry();
	let previousStripVertices = [];
	let previousPressure = 0;

	let brushVertexBuffer = new Float32Array((2 * 3 * 3) * (verticesPerStrip - 1) * (leftLineGeometry.vertices.length - 1));
	let brushColors = new Float32Array((2 * 3 * 4) * (verticesPerStrip - 1) * (leftLineGeometry.vertices.length - 1));
	let brushHeightBuffer = new Float32Array((2 * 3 * 1) * (verticesPerStrip - 1) * (leftLineGeometry.vertices.length - 1));
	let brushNormalBuffer = new Float32Array((2 * 3 * 3) * (verticesPerStrip - 1) * (leftLineGeometry.vertices.length - 1));

	const faceIndices = [ 'a', 'b', 'c' ];
	let brushVertexAttributes = [];
	for (let i=0; i<leftLineGeometry.vertices.length; i++) {
		let vertexOffset = i * verticesPerStrip;
		let pressure = Math.min(1.0, Math.min(Math.abs(-i/brushTouchdownDistance), Math.abs((leftLineGeometry.vertices.length-i)/brushTouchdownDistance)));

		// Make a bunch of vertexes connecting the two points
		let stripVertices = makeLineVertices(leftLineGeometry.vertices[i], rightLineGeometry.vertices[i], verticesPerStrip);
		if (i > 0) {
			let bufferOffset = i * (2 * 3 * 3) * (verticesPerStrip - 1);
			addFacesToVertexBuffer( brushVertexBuffer, bufferOffset, previousStripVertices, stripVertices, vertexOffset, brushNormalBuffer );
			bufferOffset = i * (2 * 3 * 4) * (verticesPerStrip - 1);
			addColorsToColorBuffer( brushColors, bufferOffset, previousPressure, pressure, verticesPerStrip, vertexOffset );
			bufferOffset = i * (2 * 3 * 1) * (verticesPerStrip - 1);
			addHeightsToHeightBuffer( brushHeightBuffer, bufferOffset, previousPressure, pressure, verticesPerStrip, vertexOffset );
		}

		previousStripVertices = stripVertices;
		previousPressure = pressure;
	}

	strokeGeometry.addAttribute( 'position', new THREE.BufferAttribute( brushVertexBuffer, 3 ) );
	strokeGeometry.addAttribute( 'color', new THREE.BufferAttribute( brushColors, 4 ) );
	strokeGeometry.addAttribute( 'height', new THREE.BufferAttribute( brushHeightBuffer, 1 ) );
	strokeGeometry.addAttribute( 'vertexNormal_modelspace', new THREE.BufferAttribute( brushNormalBuffer, 3 ) );

	let brushMaterial = new THREE.ShaderMaterial({
		vertexShader: document.getElementById("brush-vertex-shader").text,
		fragmentShader: document.getElementById("brush-fragment-shader").text,
		uniforms: { 
			LightPosition_worldspace: { type : "v3", value : new THREE.Vector3( 100, 100, 1 ) },
			lightingEnabled: { value : params.lightingEnabled },
			lightColor: { type : "v3", value : new THREE.Vector3( params.lightColor[0]/255, params.lightColor[1]/255, params.lightColor[2]/255) },
			diffuseStrength : { value : params.diffuseStrength },
			specularStrength : { value : params.specularStrength },
			saturation: { value : params.saturation },
			screenDimensions: { type : "v2", value : new THREE.Vector2( window.innerWidth, window.innerHeight ) }
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

	time += 0.01;
	LightPosition_worldspace.setX( params.lightX ).setY( params.lightY ).setZ( params.lightZ );

	brushStrokes.forEach((brushStroke) => {
		let mat = brushStroke.material;
		mat.uniforms.saturation.value = params.saturation;
		mat.uniforms.diffuseStrength.value = params.diffuseStrength;
		mat.uniforms.specularStrength.value = params.specularStrength;
		mat.uniforms.lightingEnabled.value = params.lightingEnabled;
		mat.uniforms.LightPosition_worldspace.value = LightPosition_worldspace;
		mat.uniforms.lightColor.value = new THREE.Vector3( params.lightColor[0] / 255, params.lightColor[1] / 255, params.lightColor[2] / 255);
	});

	let bg = new THREE.Color(params.backgroundColor[0]/255, params.backgroundColor[1]/255, params.backgroundColor[2]/255);
	backgroundMaterial.color.setHex(bg.getHex());

	camera.lookAt( scene.position );
	renderer.clear();
	renderer.render( scene, camera );

}
