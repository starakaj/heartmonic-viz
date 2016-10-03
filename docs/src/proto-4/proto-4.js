var mouseDownPosition = null;
var lastMousePosition = null;
var mouseCurvePositions = [];
var surf;
const w = 600, h = 600;

let brushColor1, brushColor2;
const brushPoints = 20;
const brushNoiseScale = 2;
let brushNoiseOffset = 0;
let brushWidth = 20;
var brush;


function setup() {
	createCanvas(w, h);
	surf = createGraphics(w, h);
	brushColor1 = color(random(255), random(255), random(255));
	brushColor2 = color(random(255), random(255), random(255));
	makeBrush(brushPoints);

  pixelDensity(1);

  background(180);
}

function draw() {
	background(180);
	if (mouseIsPressed) {
		if (lastMousePosition[0] !== mouseX || lastMousePosition[1] !== mouseY) {
			lastMousePosition = [mouseX, mouseY];
			mouseCurvePositions.push(lastMousePosition);
		}
	}

	image(surf, 0, 0, w, h);

	var c = color(0, 0, 0);
	stroke(c);
	noFill();
	let previous = [];
	for (let i=0; i<mouseCurvePositions.length; i++) {
		if (i > 0) {
			line(previous[0], previous[1], mouseCurvePositions[i][0], mouseCurvePositions[i][1]);
		}
		previous = mouseCurvePositions[i];
	}

	if (!mouseIsPressed && mouseCurvePositions.length) {
		var c = color(165, 10, 0);
		surf.stroke(c);
		surf.noFill();
		surf.beginShape();

		// Draw the curve
		let pp = [];
		let left = [], right = [];
		for (let i=0; i<mouseCurvePositions.length; i++) {
			let p1 = i/(mouseCurvePositions.length);
			let p2 = (i+1)/(mouseCurvePositions.length);
			let d1 = constrain(3 * brushWidth * (0.5 - abs(p1 - 0.5)), brushWidth-5, brushWidth);
			let d2 = constrain(3 * brushWidth * (0.5 - abs(p2 - 0.5)), brushWidth-5, brushWidth);
			pp.push(mouseCurvePositions[i]);
			if (pp.length >= 2) {
				if (pp.length === 5)
					pp.splice(0, 1);

				if (pp.length === 3) {
					// surf.curve(pp[0][0], pp[0][1], pp[0][0], pp[0][1], pp[1][0], pp[1][1], pp[2][0], pp[2][1]);
				} else if (pp.length === 4) {
					// surf.curve(pp[0][0], pp[0][1], pp[1][0], pp[1][1], pp[2][0], pp[2][1], pp[3][0], pp[3][1]);
					addCurveTangents(pp[0], pp[1], pp[2], pp[3], 20, d1, d2, left, right);
					if (i === mouseCurvePositions.length - 1) {
						// surf.curve(pp[1][0], pp[1][1], pp[2][0], pp[2][1], pp[3][0], pp[3][1], pp[3][0], pp[3][1]);
					}
				}
			}
		}

		// Draw a shape wrapping up the whole curve somehow
		surf.noStroke();
		surf.fill(50, 50, 120);
		for (let i=0; i<left.length; i++) {
			let lp = left[i];
			let rp = right[i];
			for (let j=0; j<100; j++) {
				let b0 = constrain(Math.round(j*brushPoints/100), 0, (brushPoints-1));
				let b1 = constrain(Math.round((j+1)*brushPoints/100), 0, (brushPoints-1));
				let dist = (j*brushPoints/100) - floor((j*brushPoints/100));
				let lineDist = j/99;
				let col = lerpColor(brush[b0].color, brush[b1].color, dist);
				surf.fill(col);
				let px = lp[0] * (1-lineDist) + rp[0]*lineDist;
				let py = lp[1] * (1-lineDist) + rp[1]*lineDist;
				surf.ellipse(px, py, 4, 4);
			}
		}
		mouseCurvePositions = [];
	}
}

function makeBrush(brushPoints) {
	brush = [];
	for (i=0; i<brushPoints; i++) {
		brush.push({
			color: lerpColor(brushColor1, brushColor2, noise((i/brushPoints) * brushNoiseScale + brushNoiseOffset))
		});
	}
}

function findAngle(p0,p1,p2) {
    var b = Math.pow(p1.x-p0.x,2) + Math.pow(p1.y-p0.y,2),
        a = Math.pow(p1.x-p2.x,2) + Math.pow(p1.y-p2.y,2),
        c = Math.pow(p2.x-p0.x,2) + Math.pow(p2.y-p0.y,2);
    return Math.acos( (a+b-c) / Math.sqrt(4*a*b) );
}

function addCurveTangents(p1, p2, p3, p4, steps, startDist, endDist, left, right) {
	for (let i = 0; i <= steps; i++) {
	  let t = i / steps;
	  let dist = (1-t) * startDist + t*endDist;
	  let x = curvePoint(p1[0], p2[0], p3[0], p4[0], t);
	  let y = curvePoint(p1[1], p2[1], p3[1], p4[1], t);
	  let tx = curveTangent(p1[0], p2[0], p3[0], p4[0], t);
	  let ty = curveTangent(p1[1], p2[1], p3[1], p4[1], t);
	  let a = atan2(ty, tx);
	  a -= PI/2.0;
	  left.push([cos(a)*dist + x, sin(a)*dist + y]);
	  a += PI;
	  right.push([cos(a)*dist + x, sin(a)*dist + y]);
	}
}

function mousePressed() {
	mouseDownPosition = [mouseX, mouseY];
	lastMousePosition = [mouseX, mouseY];
	mouseCurvePositions.push(lastMousePosition);
}

function mouseReleased() {
	mouseDownPosition = null;
}

function keyPressed() {
	if (keyCode === 32) {
		brushColor1 = color(random(255), random(255), random(255));
		brushColor2 = color(random(255), random(255), random(255));
		brushNoiseOffset = random(1000);
		makeBrush(brushPoints);
	}
}