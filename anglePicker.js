class AnglePicker {

    constructor(parent, options, rangeUpdateHandler) {

        //this.units = options.hasOwnProperty('units') ? options['units'] : 'degrees';
        this.signedAngle = options.hasOwnProperty('signedAngle') ? options['signedAngle'] : false;
        this.extents = options.hasOwnProperty('extents') ? options['extents'] : [0, 360];
        this.extents = this.signedAngle || this.isSigned(this.extents) ? this.signedToAbsoluteArray(this.extents) : this.extents;
        this.initial = options.hasOwnProperty('initial') ? options['initial'] : this.extents;
        this.initial = this.signedAngle || this.isSigned(this.initial) ? this.signedToAbsoluteArray(this.initial) : this.initial;
        this.hasExtents = (this.extents[0] > 0 || this.extents[1] < 360);
        this.hideAtExtents = options.hasOwnProperty('hideAtExtents') ? options['hideAtExtents'] : true;
        this.increment = options.hasOwnProperty('increment') ? options['increment'] : 1;
        this.precision = options.hasOwnProperty('precision') ? options['precision'] : 0;
        this.radius = options.hasOwnProperty('radius') ? options['radius'] : 50;
        this.circumference = Math.PI * 2 * this.radius;
        this.rotation = options.hasOwnProperty('rotate') ? options['rotate'] : 0;
        this.width = options.hasOwnProperty('width') ? options['width'] : '100%';
        this.height = options.hasOwnProperty('height') ? options['height'] : '100%';
        this.viewBox = options.hasOwnProperty('viewBox') ? options['viewBox'] : [0, 0, 200, 200];
        this.cx = this.viewBox[0] + this.viewBox[2]/2;
        this.cy = this.viewBox[1] + this.viewBox[3]/2;
        this.center = [this.cx, this.cy];
        this.id = options.hasOwnProperty("id") ? options["id"] : null;
        const idStr = this.id ? `id="${this.id}"` : "";
        this.zeroGuide = options.hasOwnProperty("zeroGuide") ? options["zeroGuide"] : {"stroke": "black", "stroke-dasharray": 2, "stroke-opacity": 0.5};
        this.centerPoint = options.hasOwnProperty("centerPoint") ? options["centerPoint"] : {"r": 2, "fill": "#000000"};
        this.zeroPoint = this.add(this.center, [this.radius, 0]);
        this.font = {"font-size": "1em"};
        if (options.hasOwnProperty("font")) {
            this.font = {...this.font, ...options["font"]};
        }
        this.textSpacing = options.hasOwnProperty('textSpacing') ? options['textSpacing'] : .5 + (0.15*this.precision);

        this.beginV = this.vectorFromAngle(this.extents[0]);
        this.endV = this.vectorFromAngle(this.extents[1]);
        this.aV = this.vectorFromAngle(this.initial[0]);
        this.bV = this.vectorFromAngle(this.initial[1]);
        this.bV = [this.bV[0], Math.abs((this.bV[1] - this.aV[1])) < 0.00001 ? this.aV[1] : this.bV[1]];
        this.rho = this.computeRho(this.aV, this.bV);

        this.handle = {
            "r": 5,
            "fill": "#2D3E4F",
            "stroke-width": 1
        };
        if (options.hasOwnProperty("handle")) {
            this.handle = {...this.handle, ...options["handle"]};
        }
        this.handleHighlight = {
            "r": 7,
            "fill": "transparent",
            "stroke": "#2c3e50",
            "stroke-width": 2,
            "stroke-opacity": 0.35
        };
        if (options.hasOwnProperty("handleHighlight")) {
            this.handleHighlight = {...this.handleHighlight, ...options["handleHighlight"]};
        }

        this.activeRange = options.hasOwnProperty("activeRange") ? options["activeRange"] : {
            "stroke": "#556676",
            "stroke-width": "5"
        };
        this.allowableRange = options.hasOwnProperty("allowableRange") ? options["allowableRange"] : {
            "stroke": "#d2d3d4",
            "stroke-width": "5"
        };

        parent.html(
            `<svg ${idStr} width="${this.width}" height="${this.height}" viewBox="${this.viewBox.join(' ')}" style="transform: rotate(${this.rotation}deg);" class="angle-picker">`+
            `  <rect width="100%" height="100%" x="${this.viewBox[0]}" y="${this.viewBox[1]}" fill="none" stroke="black" stroke-width="1"/>` +
            (this.zeroGuide ? `  <line x1="${this.cx}" y1="${this.cy}" x2="${this.zeroPoint[0]}" y2="${this.zeroPoint[1]}" ${this.expandAttrs(this.zeroGuide)} />` : "") +
            (this.centerPoint ? `  <circle class="center" cx="${this.cx}" cy="${this.cy}" ${this.expandAttrs(this.centerPoint)}></circle>` : "" ) +
            (this.allowableRange ? `  <circle class="allowable-range" cx="${this.cx}" cy="${this.cy}" r="${this.radius}" fill="transparent"${this.expandAttrs(this.allowableRange)} ${this.expandAttrs(this.pathAttrs(this.hasExtents ? this.computeRho(this.beginV, this.endV) : 360, this.angleToX(this.endV)))}></circle>` : "") +
            `  <circle class="active-range" cx="${this.cx}" cy="${this.cy}" r="${this.radius}" fill="transparent" ${this.expandAttrs(this.activeRange)}></circle>` +
            `  <circle class="slider-handle-highlight a" cx="${this.aV[0]}" cy="${this.aV[1]}" visibility="hidden" ${this.expandAttrs(this.handleHighlight)}></circle>` +
            `  <circle class="slider-handle a" tabIndex="0" focusable="true" style="outline: none;" cx="${this.aV[0]}" cy="${this.aV[1]}" fill="red" ${this.expandAttrs(this.handle)}></circle>` +
            `  <text class="angle a" text-anchor="middle" dominant-baseline="central" ${this.hideAtExtents && this.atExtents(this.initial[0], this.initial[1]) ? 'visibility="hidden"': ''} ${this.expandAttrs(this.font)}></text>` +
            `  <circle class="slider-handle-highlight b" cx="${this.bV[0]}" cy="${this.bV[1]}" r="7" visibility="hidden" ${this.expandAttrs(this.handleHighlight)}></circle>` +
            `  <circle class="slider-handle b" tabIndex="0" focusable="true" style="outline: none;" cx="${this.bV[0]}" cy="${this.bV[1]}" ${this.expandAttrs(this.handle)}></circle>` +
            `  <text class="angle b" text-anchor="middle" dominant-baseline="central" ${this.hideAtExtents && this.atExtents(this.initial[0], this.initial[1]) ? 'visibility="hidden"': ''} ${this.expandAttrs(this.font)}></text>` +
            `</svg>`
        );
        this.svg = parent.find('svg').get(0);
        this.rangeUpdated = rangeUpdateHandler;
        this.reference = this.svg.createSVGPoint();  // Created once for document

        this.handleA = $(this.svg).find('.slider-handle.a');
        this.handleB = $(this.svg).find('.slider-handle.b');

        this.textA = $(this.svg).find('.angle.a');
        this.textB = $(this.svg).find('.angle.b');

        this.handleAHighlight = $(this.svg).find('.slider-handle-highlight.a');
        this.handleBHighlight = $(this.svg).find('.slider-handle-highlight.b');

        this.angleRange = $(this.svg).find('.active-range');

        this.aFocus = false;
        this.aTrack = false;
        this.bFocus = false;
        this.bTrack = false;

        this.setRangeSpan();

        this.handleA.hover(function() {
            this.handleAHighlight.removeAttr('visibility');
        }.bind(this), function() {
            if (!this.aFocus) {
                this.handleAHighlight.attr('visibility', 'hidden');
            }
        }.bind(this));

        this.handleB.hover(
            function() {
                this.handleBHighlight.removeAttr('visibility');
            }.bind(this),
            function() {
                if (!this.bFocus) {
                    this.handleBHighlight.attr('visibility', 'hidden');
                }
            }.bind(this)
        );

        this.handleA.focus(
            function() {
                this.aFocus = true;
                this.aTrack = true;
                this.handleAHighlight.removeAttr('visibility');
            }.bind(this)
        );
        this.handleA.mousedown(function() { if (this.aFocus) this.aTrack = true;}.bind(this));

        this.handleB.focus(
            function() {
                this.bFocus = true;
                this.bTrack = true;
                this.handleBHighlight.removeAttr('visibility');
            }.bind(this)
        );
        this.handleB.mousedown(function() { if (this.bFocus) this.bTrack = true; }.bind(this));

        this.handleA.blur(function() {
            this.aFocus = false;
            this.aTrack = false;
            this.handleAHighlight.attr('visibility', 'hidden');
        }.bind(this));

        this.handleB.blur(function() {
            this.bFocus = false;
            this.bTrack = false;
            this.handleBHighlight.attr('visibility', 'hidden');
        }.bind(this));

        let body = $('body');
        body.mouseup(function() {
            if (this.aTrack || this.bTrack) {
                this.aTrack = false;
                this.bTrack = false;
                if (this.rangeUpdated) {
                    this.rangeUpdated(this.range, 'mouse');
                }
            }
        }.bind(this));

        this.handleA.keydown(function( event ) {
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
                        return;
                    }
                    this.aV = aVNew;
                    this.setCenter([this.handleA, this.handleAHighlight], this.aV);
                    this.setRangeSpan();
                    if (this.rangeUpdated) {
                        this.rangeUpdated(this.range, 'key');
                    }
                }
            }
        }.bind(this));

        this.handleB.keydown(function( event ) {
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
                        return;
                    }
                    this.bV = bVNew;
                    this.setCenter([this.handleB, this.handleBHighlight], this.bV);
                    this.setRangeSpan();
                    if (this.rangeUpdated) {
                        this.rangeUpdated(this.range, 'key');
                    }
                }
            }
        }.bind(this));

        body.mousemove(function(event) {
            if (this.aTrack || this.bTrack) {
                if (this.aTrack) {
                    let aVNew = this.add(this.multiply(this.normalize(this.subtract(this.svgCoords(event), this.center)), this.radius), this.center);
                    if (!this.allowed(aVNew, this.bV)) {
                        return;
                    }
                    this.aV = aVNew;
                    this.setCenter([this.handleA, this.handleAHighlight], this.aV);
                }
                else if (this.bTrack) {
                    let bVNew = this.add(this.multiply(this.normalize(this.subtract(this.svgCoords(event), this.center)), this.radius), this.center);
                    if (!this.allowed(this.aV, bVNew)) {
                        return;
                    }
                    this.bV = bVNew;
                    this.setCenter([this.handleB, this.handleBHighlight], this.bV);
                }
                this.setRangeSpan();
            }
        }.bind(this));
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

    setRangeSpan() {

        this.rho = this.computeRho(this.aV, this.bV);

        const pathAttrs = this.pathAttrs(this.rho, this.angleToX(this.bV));
        this.angleRange.attr('stroke-dashoffset', pathAttrs["stroke-dashoffset"]);
        this.angleRange.attr('stroke-dasharray', pathAttrs["stroke-dasharray"]);

        let aT = this.subtract(this.aV, this.center);
        let aTMag = this.magnitude(aT);
        let txtACenter = this.add(this.multiply(this.normalize(aT), aTMag-this.textSpacing*aTMag), this.center);
        let angle1 = this.angleToX(this.aV)
        if (this.signedAngle) angle1 = this.absoluteToSigned(angle1);
        let angle1Str = angle1.toFixed(this.precision)
        this.textA.attr('x', txtACenter[0]);
        this.textA.attr('y', txtACenter[1]);
        this.textA.attr('transform', `rotate(${-this.rotation}, ${txtACenter[0]}, ${txtACenter[1]})`);
        this.textA.html(`${angle1Str}&deg`);

        let bT = this.subtract(this.bV, this.center);
        let bTMag = this.magnitude(bT);
        let txtBCenter = this.add(this.multiply(this.normalize(bT), bTMag + this.textSpacing*bTMag), this.center);
        let angle2 = this.angleToX(this.bV)
        if (this.signedAngle) angle2 = this.absoluteToSigned(angle2);
        let angle2Str = angle2.toFixed(this.precision)
        this.textB.attr('x', txtBCenter[0]);
        this.textB.attr('y', txtBCenter[1]);
        this.textB.attr('transform', `rotate(${-this.rotation}, ${txtBCenter[0]}, ${txtBCenter[1]})`);
        this.textB.html(`${angle2Str}&deg;`);

        if (this.atExtents(angle1, angle2)) {
            this.range = [];
            if (this.hideAtExtents) {
                this.textB.attr('visibility', 'hidden');
                this.textA.attr('visibility', 'hidden');
            }
        } else {
            this.textB.removeAttr('visibility');
            this.textA.removeAttr('visibility');
            this.range = [angle2, angle1];
        }
    }

    setCenter(elements, center) {
        elements.forEach(element => {
            element.attr('cx', center[0]);
            element.attr('cy', center[1]);
        });
    };

    svgCoords(event) {
        this.reference.x = event.clientX;
        this.reference.y = event.clientY;
        let coords =  this.reference.matrixTransform(this.svg.getScreenCTM().inverse());
        return [coords.x, coords.y]
    }

    setRangeUpdateHandler(handler) {
        this.rangeUpdated = handler;
    }

    allowed(a, b) {
        // todo - use cross products
        if (this.hasExtents) {
              // If beta is less than alpha, in terms of direction, it means beta has passed through 0
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
        // Normalize angles to [0, 360) range
        theta = ((theta % 360) + 360) % 360;
        alpha = ((alpha % 360) + 360) % 360;
        beta = ((beta % 360) + 360) % 360;
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

    absoluteToSignedArray(angles) {
        return angles.map(angle => this.absoluteToSigned(angle));
    }

    // these don't 100% guarantee that the given angles are not absolute
    // or signed - only if they are
    isAbsolute(angles) {
        for (let angle of angles) {
            if (angle > 180) {
                return true
            }
        }
        return false;
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