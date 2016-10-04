function Animation(options) {
	this._duration = options.duration;
	this._onUpdateCb = options.onUpdate;
	this._running = false;
	this._startVal = options.startVal;
	this._targetVal = options.targetVal;
}

Animation.prototype = {
	constructor : Animation,

	get running() {
		return this._running;
	},

	get startVal() {
		return this._startVal;
	},

	get targetVal() {
		return this._targetVal;
	},

	start : function() {
		this._running = true;
		this._startTime = Date.now() / 1000;
	},

	update : function() {
		let progress = ((Date.now() / 1000) - this._startTime) / this._duration;
		let shouldEnd = progress >= 1.0;
		progress = Math.min(1.0, Math.max(0.0, progress));
		this._onUpdateCb(this._startVal, this._targetVal, progress);
		if (shouldEnd) this._running = false;
	}
};