class AnglePicker {

    static DEFAULT_GUIDE = {stroke: "black", "stroke-dasharray": 2, "stroke-opacity": 0.5};
    static DEFAULT_FONT = {"font-size": "1em"};
    static DEFAULT_CENTER = {r: 2, fill: "#000000"};
    static DEFAULT_MARKER = {};
    static DEFAULT_VIEWBOX = [0, 0, 200, 200];
    static DEFAULT_HANDLE = {r: 5, fill: "#2d3e4f", "stroke-width": 1};
    static DEFAULT_HANDLE_HIGHLIGHT = {r: 7, fill: "transparent", stroke: "#2c3e50", "stroke-width": 2, "stroke-opacity": 0.35};
    static DEFAULT_ACTIVE_RANGE = {stroke: "#556676", "stroke-width": "5"};
    static DEFAULT_ALLOWABLE_RANGE = {stroke: "#d2d3d4", "stroke-width": "5"};
    static DEFAULT_ANGLE_LINES = {stroke: 'black', 'stroke-opacity': 0.5};

    constructor(parent, options, rangeUpdateHandler=null, rangeMovedHandler=null, inputA=null, inputB=null) {

        this.eventDispatched = false;
        this.signedAngle = options.signedAngle || false;
        this.extents = options.extents || [0, 360];
        this.extents = this.signedAngle || this.isSigned(this.extents) ? this.signedToAbsoluteArray(this.extents) : this.extents;
        this.initial = options.initial || this.extents;
        this.initial = this.signedAngle || this.isSigned(this.initial) ? this.signedToAbsoluteArray(this.initial) : this.initial;
        this.lastRange = this.range = this.initial;
        this.hasExtents = (this.extents[0] > 0 || this.extents[1] < 360);
        this.hideAtExtents = options.hasOwnProperty('hideAtExtents') ? options.hideAtExtents : true;
        this.increment = options.increment || 1;
        this.precision = options.precision || 0;
        this.radius = options.radius || 50;
        this.circumference = Math.PI * 2 * this.radius;
        this.rotation = options.rotate || 0;
        this.width = options.width || '100%';
        this.height = options.height || '100%';
        this.viewBox = options.viewBox || AnglePicker.DEFAULT_VIEWBOX;
        this.cx = this.viewBox[0] + this.viewBox[2]/2;
        this.cy = this.viewBox[1] + this.viewBox[3]/2;
        this.center = [this.cx, this.cy];
        this.id = options.hasOwnProperty("id") ? options["id"] : null;
        const idStr = this.id ? `id="${this.id}"` : "";
        this.guides = options.hasOwnProperty('guides') ? options['guides'] : {0: [AnglePicker.DEFAULT_GUIDE, null]};
        if (Array.isArray(this.guides)) {
            // guides may also be an array of angles
            let guides = {};
            for (const angle of this.guides) {
                guides[angle] = [AnglePicker.DEFAULT_GUIDE, null];
            }
            this.guides = guides;
        }
        this.centerPoint = {...AnglePicker.DEFAULT_CENTER, ...options.centerPoint || {}};
        this.zeroPoint = this.add(this.center, [this.radius, 0]);
        this.font = {...AnglePicker.DEFAULT_FONT, ...options.font || {}};
        this.textSpacing = options.hasOwnProperty('textSpacing') ? options['textSpacing'] : .5 + (0.15*this.precision);

        this.beginV = this.vectorFromAngle(this.extents[0]);
        this.endV = this.vectorFromAngle(this.extents[1]);
        this.aV = this.vectorFromAngle(this.initial[0]);
        this.bV = this.vectorFromAngle(this.initial[1]);
        this.bV = [this.bV[0], Math.abs((this.bV[1] - this.aV[1])) < 0.00001 ? this.aV[1] : this.bV[1]];
        this.rho = this.computeRho(this.aV, this.bV);

        this.handle = {...AnglePicker.DEFAULT_HANDLE, ...options.handle || {}};
        this.handleHighlight = {...AnglePicker.DEFAULT_HANDLE_HIGHLIGHT, ...options.handleHighlight || {}};
        this.angleLines = false;
        if (options.hasOwnProperty('angleLines') && options.angleLines) {
            this.angleLines = {...AnglePicker.DEFAULT_ANGLE_LINES, ...typeof options.angleLines === 'object' ? options.angleLines : {}};
        }

        this.activeRange = {...AnglePicker.DEFAULT_ACTIVE_RANGE, ...options.activeRange || {}};
        if (options.allowableRange == false) {
            this.allowableRange = false;
        } else {
            this.allowableRange = {...AnglePicker.DEFAULT_ALLOWABLE_RANGE, ...options.allowableRange || {}};
        }
        if (typeof parent === 'string') {
            parent = document.querySelector(parent);
        }
        if (typeof inputA === 'string') {
            inputA = document.querySelector(inputA);
        }
        if (typeof inputB === 'string') {
            inputB = document.querySelector(inputB);
        }
        this.inputA = inputA;
        this.inputB = inputB;
        if (this.inputA) {
            this.inputA.addEventListener('change', (event) => {
                this.eventDispatched = true;
                this.setA(event.target.value);
                this.eventDispatched = false;
            });
        }
        if (this.inputB) {
            this.inputB.addEventListener('change', (event) => {
                this.eventDispatched = true;
                this.setB(event.target.value);
                this.eventDispatched = false;
            });
        }

        this.parent = parent;
        if (!this.parent.querySelector('svg')) {
            
            let guideLines = '';
            Object.entries(this.guides).forEach(([angle, [guide, marker]]) => {
                if (typeof angle === 'string') {
                    angle = parseFloat(angle);
                }
                const vector = this.vectorFromAngle(angle);
                if (guide) {
                    guide = {...AnglePicker.DEFAULT_GUIDE, ...guide};
                    guideLines += `  <line class="guide-line" x1="${this.cx}" y1="${this.cy}" x2="${vector[0]}" y2="${vector[1]}" ${this.expandAttrs(guide)} />\n`;
                }
                if (marker) {
                    let [text, attrs] = marker;
                    let delta = [0, 0];
                    if (attrs && attrs.hasOwnProperty('delta')) {
                        delta = attrs.delta;
                        delete attrs.delta;
                    }
                    attrs = {...AnglePicker.DEFAULT_MARKER, ...AnglePicker.DEFAULT_FONT, ...attrs};
                    guideLines += `  <text class="guide-marker" text-anchor="middle" dominant-baseline="central" ${this.expandAttrs(this.textPos(vector, this.textSpacing, delta))} ${this.expandAttrs(marker)}>${text}</text>\n`;
                }
            });

            this.parent.innerHTML = (
                `<svg ${idStr} width="${this.width}" height="${this.height}" viewBox="${this.viewBox.join(' ')}" style="transform: rotate(${this.rotation}deg);" class="angle-picker">`+
                `${guideLines}` +
                (this.centerPoint ? `  <circle class="center" cx="${this.cx}" cy="${this.cy}" ${this.expandAttrs(this.centerPoint)}></circle>` : "" ) +
                (this.allowableRange ? `  <circle class="allowable-range" cx="${this.cx}" cy="${this.cy}" r="${this.radius}" fill="transparent"${this.expandAttrs(this.allowableRange)} ${this.expandAttrs(this.pathAttrs(this.hasExtents ? this.computeRho(this.beginV, this.endV) : 360, this.angleToX(this.endV)))}></circle>` : "") +
                (this.angleLines ? `  <line class="angle-line a" x1="${this.cx}" y1="${this.cy}" x2="${this.aV[0]}" y2="${this.aV[1]}" ${this.expandAttrs({...this.angleLines, ...options.angleLineA || {}})}/>` : "") +
                (this.angleLines ? `  <line class="angle-line b" x1="${this.cx}" y1="${this.cy}" x2="${this.bV[0]}" y2="${this.bV[1]}" ${this.expandAttrs({...this.angleLines, ...options.angleLineB || {}})}/>` : "") +
                `  <circle class="active-range" cx="${this.cx}" cy="${this.cy}" r="${this.radius}" fill="transparent" ${this.expandAttrs(this.activeRange)}></circle>` +
                `  <circle class="slider-handle-highlight a" cx="${this.aV[0]}" cy="${this.aV[1]}" visibility="hidden" ${this.expandAttrs({...this.handleHighlight, ...options.handleHighlightA || {}})}></circle>` +
                `  <circle class="slider-handle a" tabIndex="0" focusable="true" style="outline: none;" cx="${this.aV[0]}" cy="${this.aV[1]}" ${this.expandAttrs({...this.handle, ...options.handleA || {}})}></circle>` +
                `  <text class="angle a" text-anchor="middle" dominant-baseline="central" ${this.hideAtExtents && this.atExtents(this.initial[0], this.initial[1]) ? 'visibility="hidden"': ''} ${this.expandAttrs(this.font)}></text>` +
                `  <circle class="slider-handle-highlight b" cx="${this.bV[0]}" cy="${this.bV[1]}" r="7" visibility="hidden" ${this.expandAttrs({...this.handleHighlight, ...options.handleHighlightB || {}})}></circle>` +
                `  <circle class="slider-handle b" tabIndex="0" focusable="true" style="outline: none;" cx="${this.bV[0]}" cy="${this.bV[1]}" ${this.expandAttrs({...this.handle, ...options.handleB || {}})}></circle>` +                
                `  <text class="angle b" text-anchor="middle" dominant-baseline="central" ${this.hideAtExtents && this.atExtents(this.initial[0], this.initial[1]) ? 'visibility="hidden"': ''} ${this.expandAttrs(this.font)}></text>` +
                `</svg>`
            );
        }
        this.svg = parent.querySelector('svg');
        this.rangeUpdateHandler = rangeUpdateHandler;
        this.rangeMovedHandler = rangeMovedHandler;
        this.reference = this.svg.createSVGPoint();  // Created once for document

        this.handleA = this.svg.querySelector('.slider-handle.a');
        this.handleB = this.svg.querySelector('.slider-handle.b');

        this.textA = this.svg.querySelector('.angle.a');
        this.textB = this.svg.querySelector('.angle.b');

        this.lineA = this.angleLines ? this.svg.querySelector('.angle-line.a') : null;
        this.lineB = this.angleLines ? this.svg.querySelector('.angle-line.b') : null;

        this.handleAHighlight = this.svg.querySelector('.slider-handle-highlight.a');
        this.handleBHighlight = this.svg.querySelector('.slider-handle-highlight.b');

        this.angleRange = this.svg.querySelector('.active-range');

        this.aFocus = false;
        this.aTrack = false;
        this.bFocus = false;
        this.bTrack = false;

        this.setRangeSpan();

        this.handleA.addEventListener('mouseenter', () => {
            this.handleAHighlight.removeAttribute('visibility');
        });
        
        this.handleA.addEventListener('mouseleave', () => {
            if (!this.aFocus) {
                this.handleAHighlight.setAttribute('visibility', 'hidden');
            }
        });

        this.handleB.addEventListener('mouseenter', () => {
            this.handleBHighlight.removeAttribute('visibility');
        });
        
        this.handleB.addEventListener('mouseleave', () => {
            if (!this.bFocus) {
                this.handleBHighlight.setAttribute('visibility', 'hidden');
            }
        });

        this.handleA.addEventListener('focus', () => {
            this.aFocus = true;
            this.aTrack = true;
            this.handleAHighlight.removeAttribute('visibility');
        });
        
        this.handleA.addEventListener('mousedown', () => {
            if (this.aFocus) this.aTrack = true;
        });
        
        this.handleB.addEventListener('focus', () => {
            this.bFocus = true;
            this.bTrack = true;
            this.handleBHighlight.removeAttribute('visibility');
        });
        
        this.handleB.addEventListener('mousedown', () => {
            if (this.bFocus) this.bTrack = true;
        });
        
        this.handleA.addEventListener('blur', () => {
            this.aFocus = false;
            this.aTrack = false;
            this.handleAHighlight.setAttribute('visibility', 'hidden');
        });
        
        this.handleB.addEventListener('blur', () => {
            this.bFocus = false;
            this.bTrack = false;
            this.handleBHighlight.setAttribute('visibility', 'hidden');
        });
        
        document.body.addEventListener('mouseup', () => {
            if (this.aTrack || this.bTrack) {
                this.aTrack = false;
                this.bTrack = false;
                this.rangeUpdated(this.range, 'mouse');
            }
        });
        
        this.handleA.addEventListener('keydown', (event) => {
            if (this.aFocus) {
                if ([37, 38, 39, 40].includes(event.which)) {
                    event.preventDefault();
                    let aVNew = this.add(
                        this.rotate(
                            this.subtract(this.aV, this.center),
                            [37, 38].includes(event.which) ? -this.increment : this.increment
                        ),
                        this.center
                    );
                    if (!this.allowed(aVNew, this.bV)) {
                        if (this.aV === this.beginV || this.aV === this.endV) return;
                        aVNew = this.clip(aVNew);
                    }
                    this.aV = aVNew;
                    this.setCenter([this.handleA, this.handleAHighlight], this.aV);
                    this.setRangeSpan();
                    this.rangeUpdated(this.range, 'key');
                }
            }
        });
        
        this.handleB.addEventListener('keydown', (event) => {
            if (this.bFocus) {
                if ([37, 38, 39, 40].includes(event.which)) {
                    event.preventDefault();
                    let bVNew = this.add(
                        this.rotate(
                            this.subtract(this.bV, this.center),
                            [37, 38].includes(event.which) ? -this.increment : this.increment
                        ),
                        this.center
                    );
                    if (!this.allowed(this.aV, bVNew)) {
                        if (this.bV === this.beginV || this.bV === this.endV) return;
                        bVNew = this.clip(bVNew);
                    }
                    this.bV = bVNew;
                    this.setCenter([this.handleB, this.handleBHighlight], this.bV);
                    this.setRangeSpan();
                    this.rangeUpdated(this.range, 'key');
                }
            }
        });

        document.body.addEventListener('mousemove', (event) => {
            if (this.aTrack || this.bTrack) {
                if (this.aTrack) {
                    let aVNew = this.add(this.multiply(this.normalize(this.subtract(this.svgCoords(event), this.center)), this.radius), this.center);
                    if (!this.allowed(aVNew, this.bV)) {
                        if (this.aV === this.beginV || this.aV === this.endV) return;
                        aVNew = this.clip(aVNew);
                    }
                    this.aV = aVNew;
                    this.setCenter([this.handleA, this.handleAHighlight], this.aV);
                } else if (this.bTrack) {
                    let bVNew = this.add(this.multiply(this.normalize(this.subtract(this.svgCoords(event), this.center)), this.radius), this.center);
                    if (!this.allowed(this.aV, bVNew)) {
                        if (this.bV === this.beginV || this.bV === this.endV) return;
                        bVNew = this.clip(bVNew);
                    }
                    if (bVNew === this.bV) return;
                    this.bV = bVNew;
                    this.setCenter([this.handleB, this.handleBHighlight], this.bV);
                }
                this.setRangeSpan();
            }
        });
        
    }

    setA(angle) {
        this.aV = this.vectorFromAngle(angle);
        this.setCenter([this.handleA, this.handleAHighlight], this.aV);
        this.setRangeSpan();
    }

    setB(angle) {
        this.bV = this.vectorFromAngle(angle);
        this.setCenter([this.handleB, this.handleBHighlight], this.bV);
        this.setRangeSpan();
    }

    dispatchEvent(element, event) {
        if (!this.eventDispatched) {
            this.eventDispatched = true;
            element.dispatchEvent(new Event(event, {'bubbles': true, 'cancelable': true}));
            this.eventDispatched = false;
        }
    }

    rangeUpdated(newRange, mode) {
        this.range = newRange;
        if (this.inputA && this.lastRange[0] != this.range[0]) {
            this.inputA.value = this.range[0];
            this.dispatchEvent(this.inputA, 'change');
        }
        if (this.inputB && this.lastRange[1] != this.range[1]) {
            this.inputB.value = this.range[1];
            this.dispatchEvent(this.inputB, 'change');
        }
        if (this.rangeUpdateHandler) {
            this.rangeUpdateHandler(newRange, mode);
        }
        this.lastRange = this.range;
    }

    expandAttrs(attributes) {
        return Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ');
    }

    computeRho(v1, v2) {
        // todo - when at full circle may end up being zero - does this fuck anything up other than extent rho at full circle?
        let aTV = this.subtract(v1, this.center);
        let bTV = this.subtract(v2, this.center);
        let axb = this.cross(aTV, bTV);
        let xTheta = Math.asin(axb)*180/Math.PI;
        let rho = null;
        if (xTheta < 0) {
            rho = 360-this.angle(aTV, bTV);
        }
        else {
            rho = this.angle(aTV, bTV);
        }
        rho = 360 - rho;
        if (isNaN(rho) || (this.hasExtents && this.equal(rho, 360))) {
            rho = 0;
        }
        return rho;
    }

    clip(vector) {
        // clip vector to closest extent
        if (this.angle(vector, this.beginV) < this.angle(vector, this.endV)) {
            return this.beginV;
        }
        return this.endV;
    }

    textPos(vector, spacing=0, delta=[0, 0]) {
        let aT = this.subtract(vector, this.center);
        let aTMag = this.magnitude(aT);
        let pos = this.add(this.add(this.multiply(this.normalize(aT), aTMag+spacing*aTMag), this.center), delta);
        return {
            x: pos[0],
            y: pos[1],
            transform: `rotate(${-this.rotation}, ${pos[0]}, ${pos[1]})`
        };
    }

    setRangeSpan() {

        this.rho = this.computeRho(this.aV, this.bV);

        const pathAttrs = this.pathAttrs(this.rho, this.angleToX(this.bV));
        this.angleRange.setAttribute('stroke-dashoffset', pathAttrs["stroke-dashoffset"]);
        this.angleRange.setAttribute('stroke-dasharray', pathAttrs["stroke-dasharray"]);

        let angle1 = this.angleToX(this.aV)
        if (this.signedAngle) angle1 = this.absoluteToSigned(angle1);
        let angle1Str = angle1.toFixed(this.precision);
        Object.entries(this.textPos(this.aV, -this.textSpacing)).forEach(([attr, value]) => {this.textA.setAttribute(attr, value);});
        this.textA.textContent = (`${angle1Str}°`);
        if (this.lineA) {
            this.lineA.setAttribute('x2', this.aV[0]);
            this.lineA.setAttribute('y2', this.aV[1]);
        }

        let angle2 = this.angleToX(this.bV)
        if (this.signedAngle) angle2 = this.absoluteToSigned(angle2);
        let angle2Str = angle2.toFixed(this.precision);
        Object.entries(this.textPos(this.bV, this.textSpacing)).forEach(([attr, value]) => {this.textB.setAttribute(attr, value);});
        this.textB.textContent = (`${angle2Str}°`);
        if (this.lineB) {
            this.lineB.setAttribute('x2', this.bV[0]);
            this.lineB.setAttribute('y2', this.bV[1]);
        }

        if (this.inputA && this.range[0] != angle1) {
            this.inputA.value = angle1;
            this.dispatchEvent(this.inputA, 'input');
            if (this.rangeMovedHandler) {
                this.rangeMovedHandler(angle1, angle2);
            }
        }
        if (this.inputB && this.range[1] != angle2) {
            this.inputB.value = angle2;
            this.dispatchEvent(this.inputB, 'input');
            if (this.rangeMovedHandler) {
                this.rangeMovedHandler(angle1, angle2);
            }
        }

        if (this.atExtents(this.signedToAbsolute(angle1), this.signedToAbsolute(angle2))) {
            this.range = [];
            if (this.hideAtExtents) {
                this.textB.setAttribute('visibility', 'hidden');
                this.textA.setAttribute('visibility', 'hidden');
            }
        } else {
            this.textB.removeAttribute('visibility');
            this.textA.removeAttribute('visibility');
            this.range = [angle1, angle2];
        }
    }

    setCenter(elements, center) {
        elements.forEach(element => {
            element.setAttribute('cx', center[0]);
            element.setAttribute('cy', center[1]);
        });
    };

    svgCoords(event) {
        this.reference.x = event.clientX;
        this.reference.y = event.clientY;
        let coords =  this.reference.matrixTransform(this.svg.getScreenCTM().inverse());
        return [coords.x, coords.y]
    }

    setRangeUpdateHandler(handler) {
        this.rangeUpdateHandler = handler;
    }
    
    setRangeMovedHandler(handler) {
        this.rangeMovedHandler = handler;
    }

    allowed(a, b) {
        if (this.hasExtents) {
            const aDeg = this.angleToX(a);
            const bDeg = this.angleToX(b);
            return (
                this.isBetween(aDeg, this.extents[0], this.extents[1]) &&
                this.isBetween(bDeg, this.extents[0], this.extents[1])
            );
        }
        return true;
    }

    isBetween(theta, alpha, beta) {
        // Adjust angles to make alpha as zero point
        beta = ((beta - alpha + 360) % 360);
        theta = ((theta - alpha + 360) % 360);
        return theta <= beta;
      }

    rotate(vector, degrees) {
        degrees *= (Math.PI/180);
        return [
            vector[0]*Math.cos(degrees)+vector[1]*Math.sin(degrees),
            // in svg coords, positive y is down
            -1*(vector[0]*Math.sin(degrees))+vector[1]*Math.cos(degrees)
        ];
    }

    multiply(vector, scalar) {
        return [vector[0]*scalar, vector[1]*scalar];
    }

    subtract(v1, v2) {
        return [v1[0]-v2[0], v1[1]-v2[1]];
    }

    add(v1, v2) {
        return [v1[0]+v2[0], v1[1]+v2[1]];
    }

    magnitude(vector) {
        return Math.sqrt(vector[0]*vector[0]+vector[1]*vector[1]);
    }

    normalize(vector) {
        let mag = this.magnitude(vector);
        return [vector[0]/mag, vector[1]/mag];
    }

    angle(v1, v2) {
        return Math.acos(
            (v1[0]*v2[0]+v1[1]*v2[1]) / (
                Math.sqrt(v1[0]*v1[0]+v1[1]*v1[1]) * Math.sqrt(v2[0]*v2[0]+v2[1]*v2[1])
            )
        )*180/Math.PI;
    }
    
    cross(v1, v2) {
        let normV1 = this.normalize(v1);
        let normV2 = this.normalize(v2);
        return normV1[0] * normV2[1] - normV1[1] * normV2[0];
    }
    
    angleToX(vector, center) {
        vector = this.subtract(vector, center || this.center);
        let agl = Math.atan2(vector[1], vector[0]) * 180 / Math.PI;
        if (agl > 0) {
            agl = 180 + (180-agl);
        } else {
            agl = -agl;
        }
        return Object.is(agl, -0) ? 0 : agl;
    }

    vectorFromAngle(angle) {
        return this.add(
            this.rotate([this.radius, 0], angle),
            this.center
        );
    }

    /* signed angle to absolute and vice versa converters */
    signedToAbsolute(angle) {
        return angle < 0 ? angle + 360 : angle;
    }

    signedToAbsoluteArray(angles) {
        return angles.map(angle => this.signedToAbsolute(angle));
    }

    absoluteToSigned(angle) {
        return angle > 180 ? angle - 360 : angle;
    }

    isSigned(angles) {
        for (let angle of angles) {
            if (angle < 0) {
                return true
            }
        }
        return false;
    }

    pathAttrs(rho, angleB) {
        angleB = angleB % 360;
        // Calculate the length of the path to be drawn
        const pathLength = rho == 0 ? 0 : this.equal(rho, 360) ? this.circumference : (this.circumference * (((rho % 360) + 360) % 360)) / 360;
        // if (this.hasExtents && this.pathLength )
        let dashes = [pathLength, this.circumference - pathLength];
        const strokeDashoffset = (this.circumference * angleB) / 360;

        // strokes are drawn clockwise b/c of course this should be as hard as possible!
        if (!this.equal(pathLength, 0) && this.hasExtents) {
            // to make this math simple we set our position to be zero along the number line
            // and recompute the two extent points and the angleA to be > zero because the
            // only thing that matters here is the distances between the points.
            const position = this.circumference - strokeDashoffset;  // this is the origin
            let length = pathLength;
            const extents = [
                this.circumference - this.extents[0]/360*this.circumference + 0.0000001,
                this.circumference - this.extents[1]/360*this.circumference - 0.0000001,
            ];
            if (extents[0] < position) {
                extents[0] += this.circumference;
            }
            if (extents[1] < position) {
                extents[1] += this.circumference;
            }
            if ((position + length) > extents[0]) {
                dashes = [];
                dashes.push(extents[0] - position);
                dashes.push(extents[1] - extents[0]);
                length = length - (extents[1] - position);
                if (length > 0) {
                    dashes.push(length);
                    dashes.push(this.circumference - pathLength)
                }
            }
        }
        return {
            'stroke-dasharray': dashes.join(" "),
            'stroke-dashoffset': strokeDashoffset
        };
    }

    equal(a, b, prec=null) {
        a = a % 360
        b = b % 360
        return Math.abs(a - b) < Math.pow(10, -(prec || this.precision));
    }

    atExtents(a1, a2) {
        return this.equal(a1, this.extents[0]) && this.equal(a2, this.extents[1]);
    }
}
