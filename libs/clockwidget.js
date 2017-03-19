/**
 * @param {DOMElement} DOMcontainer       Will contain the webgl canvas were the widget will be drawn 
 * @param {Object} opt                    Enables options 
 */
function ClockWidget(DOMcontainer, opt) {
    "use strict";


    // TODO: set default background colors


    this.DOMcontainer = DOMcontainer;
    this.canvas = null;
    this.ctx = this.initContext();


    // construction params
    this.alpha    = opt.alpha;
    this.alphaVal = String(opt.value);
    this.anim     = opt.anim;
    this.animcolors = opt.animcolors;


    // customizable params
    var textureUrl = 'assets/clocktext.png';
    if(opt.hasOwnProperty('customTexture')) {
        textureUrl = opt.customTexture;
    } 
    this.clockTexture = this.load_texture(textureUrl, true);

    this.modelUrl = "assets/clock7.json";

    this.colors = [
        [150,  132,  125 ],
        [65,  60,  59 ],
        [65,  60,  59 ],
        [218,  200, 193 ],
        [150,  132,  125 ],
        [90,  78,  78 ],
        [255,  38, 38 ],
        [48,  48, 48 ],

        /*
        [150,  132,  125],    // minutes handle
        [218,  200,  193],    // seconds handle
        [65,  60,  59 ],      // central small circle
        [73,  67,  66 ],      // central clock
        [79,  73,  71 ],      // outer circle
        [88,  81,  79 ],      // inner circle
        [255,  230,  213],    //  little handle
        [48,  48,  48 ],      // bigger handle
        */
    ];

    if(opt.hasOwnProperty('clockColors')) {
        this.colors = [
            opt.clockColors.minHandle,
            opt.clockColors.secHandle,
            opt.clockColors.circHandle,
            opt.clockColors.display,
            opt.clockColors.outerEdge,
            opt.clockColors.innerEdge,
            opt.clockColors.sec2Handle,
            opt.clockColors.hourHandle
        ];
    }



    // drawing variables
    this.deltatime = 0;
    this.then = 0;
    this.step = Float32Array.BYTES_PER_ELEMENT;
    this.projection = mat4.create();
    // we'll feed an array of model matrices for each part of the clock
    this.model = [];
    this.view = mat4.create();



    // mouse move and clock variables
    this.br = 0;
    this.cync = 0;
    this.cxnc = 0;
    this.lastXnc = 0;
    this.lastYnc = 0;
    this.now = 0;



    this.clockGeometry;
    this.MainProgram;
    this.OffscreenProgram;
    this.OffscreenFBO;
    this.loadClockGeometry();


    window.addEventListener('resize', this.onResize.bind(this));
}

ClockWidget.prototype.initContext = function () {
    "use strict";

    var canvas = document.createElement('canvas');
    canvas.style.border = "none";
    canvas.width = this.DOMcontainer.clientWidth;
    canvas.height = this.DOMcontainer.clientHeight;
    canvas.id = 'cwcanvas';
    this.DOMcontainer.appendChild(canvas);
    this.canvas = canvas;

    var names = ["webgl", "experimental-webgl"];
    var ctx;

    for (var i in names) {
        try {
            var ctxparams = {};
            if (this.alpha || this.anim) ctxparams.alpha = true;
            ctx = canvas.getContext(names[i], ctxparams);

            if (ctx && typeof ctx.getParameter == "function") {
                // WebGL is enabled 
                break;
            }
        } catch (e) { }
    }

    if (ctx === null)
        alert("could not initialize WebGL");


    window.addEventListener("mousemove", this.mouseMove.bind(this));

    return ctx;
};


ClockWidget.prototype.createMainProgram = function () {
    "use strict";

    var vertex_shader =
        "attribute vec4 aPos;" +
        "attribute vec3 aNormal;" +
        "attribute vec3 aColor;" +
        "attribute vec2 aUV;" +
        "" +
        "uniform mat4 uProjection;" +
        "uniform mat4 uModel[" + this.clockGeometry.nmeshes + "];" +
        "uniform mat4 uView;" +
        "" +
        "varying vec3 Color;" +
        "varying vec3 Normal;" +
        "varying vec3 FragPos;" +
        "varying vec2 UV;" +
        "" +
        "void main() {" +
        "    vec4 ndcpos = uProjection * uView * uModel[int(aPos.w)] * vec4(aPos.xyz, 1.0);" +
        "    gl_Position = ndcpos;" +
        "    Color  = aColor;" +
        "    Normal  = mat3(uModel[int(aPos.w)]) * normalize(aNormal);" +
        "    FragPos = vec3(uModel[int(aPos.w)]  * vec4(aPos.xyz, 1.0));" +
        "    UV = aUV;" +
        "}";


    var fragment_shader =
        "precision mediump float;" +
        "" +
        "uniform vec3 uLightPos;" +
        "uniform sampler2D uClockTexture;" +
        "uniform sampler2D uOffscreenFBO;" +
        "" +
        "varying vec3 Color;" +
        "varying vec3 Normal;" +
        "varying vec3 FragPos;" +
        "varying vec2 UV;" +
        "" +
        "void main() {" +
        "    vec3 LightDir = normalize(vec3(uLightPos - FragPos));" +
        "    float diffuse = max(dot(LightDir, normalize(Normal)), 0.0);" +
        "    vec4 col = vec4(Color * diffuse, 1.0);" +
        "    gl_FragColor = col;";

    if (!this.anim && !this.alpha) {
        fragment_shader +=
            "" +
            "    if(UV.x != 0.0 || UV.y != 0.0)" +
            "       gl_FragColor = vec4(col.xyz * texture2D(uClockTexture, UV).r, 1.0);" +
            "}";
    }

    if (this.anim && !this.alpha) {
        fragment_shader +=
            "" +
            "    if(UV.x != 0.0 || UV.y != 0.0) {" +
            "       vec4 offtexture = texture2D(uOffscreenFBO, UV);" +
            "       vec4 clockTexture = texture2D(uClockTexture, UV);" +
            "       vec3 combined   = offtexture.xyz * clockTexture.r;" +
            "       float alpha     = (1.0 - clockTexture.r) + offtexture.a;" +
            "       gl_FragColor = vec4(combined * alpha, alpha);" +
            "    };" +
            "}";
    }

    if (!this.anim && this.alpha) {
        fragment_shader +=
            "" +
            "    if(UV.x != 0.0 || UV.y != 0.0) {" +
            "       vec4 clockTexture = vec4(vec3(0.0, 0.0, 0.0), 1.0 - texture2D(uClockTexture, UV).r);" +
            "       vec4 black  = vec4(0.0);" +
            "       vec4 bkgcol = vec4(vec3(1.0) * " + this.alphaVal + ", " + this.alphaVal * this.alphaVal + ");" +
            "       vec4 mix    = vec4(bkgcol  * (1.0 - clockTexture.a) + clockTexture * clockTexture.a);" +
            "       vec4 final  = mix;" +
            "       gl_FragColor = vec4(final.xyz * final.a, final.a);" +
            "    };" +
            "}";
    }

    if (this.anim && this.alpha) {
        fragment_shader +=
            "" +
            "    if(UV.x != 0.0 || UV.y != 0.0) {" +
            "       vec4 offtexture = texture2D(uOffscreenFBO, UV);" +
            "       vec4 clockTexture = texture2D(uClockTexture, UV);" +
            "       vec3 combined   = col.xyz * offtexture.xyz * clockTexture.r;" +
            "       float alpha     = (1.0 - clockTexture.r) + offtexture.a;" +
            "       gl_FragColor = vec4(combined * alpha, alpha);" +
            "    };" +
            "}";
    }

    var Program = createProgramFromSource(vertex_shader, fragment_shader, this.ctx);
    Program.aPos = this.ctx.getAttribLocation(Program, "aPos");
    Program.aNormal = this.ctx.getAttribLocation(Program, "aNormal");
    Program.aColor = this.ctx.getAttribLocation(Program, "aColor");
    Program.aUV = this.ctx.getAttribLocation(Program, "aUV");

    Program.uProjection = this.ctx.getUniformLocation(Program, "uProjection");
    Program.uModel = [];
    for (var i = 0; i < this.clockGeometry.nmeshes; i++) {
        Program.uModel.push(this.ctx.getUniformLocation(Program, "uModel[" + i + "]"));
    }
    Program.uView = this.ctx.getUniformLocation(Program, "uView");

    Program.uLightPos = this.ctx.getUniformLocation(Program, "uLightPos");
    Program.uClockTexture = this.ctx.getUniformLocation(Program, "uClockTexture");
    Program.uOffscreenFBO = this.ctx.getUniformLocation(Program, "uOffscreenFBO");

    Program.vbuffer = this.ctx.createBuffer();
    Program.ebuffer = this.ctx.createBuffer();

    Program.nverts = 0;
    Program.nelem = 0;


    this.MainProgram = Program;
};

ClockWidget.prototype.createOffscreenProgram = function () {
    "use strict";

    var vertex_shader =
        "attribute vec4 aPos;" +
        "" +
        "varying vec2 FragPos;" +
        "" +
        "void main() {" +
        "    gl_Position = vec4(aPos.xy, 0.0, 1.0);" +
        "    FragPos = aPos.xy;" +
        "}";


    var fragment_shader =
        "precision mediump float;" +
        "" +
        "uniform vec2  uLightPos[3];" +
        "uniform vec3  uLightColor[3];" +
        "uniform float uLightSize[3];" +
        "" +
        "varying vec2 FragPos;" +
        "" +
        "void main() {" +
        "    vec4 finalColor = vec4(0.0);" +
        "    for(int i = 0; i < 3; i++) {" +
        "        float alpha  = uLightSize[i] / (1.0 + length(FragPos - uLightPos[i]));" +
        "        finalColor.xyz += uLightColor[i] * alpha;" +
        "        finalColor.a   += alpha * alpha;" +
        "    }" +
        "    gl_FragColor = finalColor;" +
        "}";


    var Program = createProgramFromSource(vertex_shader, fragment_shader, this.ctx);
    Program.aPos = this.ctx.getAttribLocation(Program, "aPos");

    // normalizing rgb values to 0 < x < 1 domain
    for(var i = 0; i < 3; i++) {
        this.animcolors[i][0] = this.animcolors[i][0] / 255;
        this.animcolors[i][1] = this.animcolors[i][1] / 255;
        this.animcolors[i][2] = this.animcolors[i][2] / 255;
    }

    Program.LightPos = [[-0.5, -0.5], [0.5, 0.5], [0.0, 0.0]];
    Program.LightSize = [1, 1, 1];
    Program.LightColor = [this.animcolors[0], this.animcolors[1], this.animcolors[2]];

    Program.uLightPos = [];
    Program.uLightColor = [];
    Program.uLightSize = [];

    for (var i = 0; i < 3; i++) {
        Program.uLightPos.push(this.ctx.getUniformLocation(Program, "uLightPos[" + i + "]"));
        Program.uLightColor.push(this.ctx.getUniformLocation(Program, "uLightColor[" + i + "]"));
        Program.uLightSize.push(this.ctx.getUniformLocation(Program, "uLightSize[" + i + "]"));
    }

    var vertices = [
        -1.0, -1.0, 0.0, 0.0,
        -1.0, +1.0, 0.0, 1.0,
        +1.0, -1.0, 1.0, 0.0,

        +1.0, -1.0, 1.0, 0.0,
        -1.0, +1.0, 0.0, 1.0,
        +1.0, +1.0, 1.0, 1.0
    ];

    Program.vbuffer = this.ctx.createBuffer();
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, Program.vbuffer);
    this.ctx.bufferData(this.ctx.ARRAY_BUFFER, new Float32Array(vertices), this.ctx.STATIC_DRAW);

    this.OffscreenProgram = Program;
};

ClockWidget.prototype.createOffscreenFBO = function () {
    "use strict";

    var FBO = this.ctx.createFramebuffer();
    this.ctx.bindFramebuffer(this.ctx.FRAMEBUFFER, FBO);

    FBO.texture = this.ctx.createTexture();

    this.ctx.bindTexture(this.ctx.TEXTURE_2D, FBO.texture);
    this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_WRAP_S, this.ctx.CLAMP_TO_EDGE);
    this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_WRAP_T, this.ctx.CLAMP_TO_EDGE);
    this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_MAG_FILTER, this.ctx.LINEAR);
    this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_MIN_FILTER, this.ctx.LINEAR);
    //this.ctx.generateMipmap(gl.TEXTURE_2D);

    this.ctx.texImage2D(this.ctx.TEXTURE_2D, 0,
        this.ctx.RGBA,
        this.canvas.width,
        this.canvas.height,
        0,
        this.ctx.RGBA,
        this.ctx.UNSIGNED_BYTE,
        null);

    this.ctx.framebufferTexture2D(this.ctx.FRAMEBUFFER, this.ctx.COLOR_ATTACHMENT0, this.ctx.TEXTURE_2D, FBO.texture, 0);

    this.ctx.bindTexture(this.ctx.TEXTURE_2D, null);
    this.ctx.bindFramebuffer(this.ctx.FRAMEBUFFER, null);

    this.OffscreenFBO = FBO;
};

ClockWidget.prototype.draw = function (now) {
    "use strict";

    if (!this.MainProgram) return;

    now *= 0.001;
    this.deltatime = now - this.then;
    this.then = now;




    this.updateClockAndMatrices();
    if (this.anim) this.drawOffscreenFBO(now);
    this.drawClock();
};

ClockWidget.prototype.drawClock = function () {
    "use strict";

    this.ctx.bindFramebuffer(this.ctx.FRAMEBUFFER, null);
    if (this.alpha || this.anim)
        this.ctx.clearColor(0.0, 0.0, 0.0, 0.0);
    else
        this.ctx.clearColor(0.25490196, 0.23529411, 0.23137254, 1.0);

    this.ctx.clear(this.ctx.COLOR_BUFFER_BIT);

    this.ctx.useProgram(this.MainProgram);
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.MainProgram.vbuffer);
    this.ctx.bindBuffer(this.ctx.ELEMENT_ARRAY_BUFFER, this.MainProgram.ebuffer);

    this.ctx.enableVertexAttribArray(this.MainProgram.aPos);
    this.ctx.enableVertexAttribArray(this.MainProgram.aNormal);
    this.ctx.enableVertexAttribArray(this.MainProgram.aColor);
    this.ctx.enableVertexAttribArray(this.MainProgram.aUV);
    this.ctx.vertexAttribPointer(this.MainProgram.aPos, 4, this.ctx.FLOAT, false, this.step * 12, 0);
    this.ctx.vertexAttribPointer(this.MainProgram.aNormal, 3, this.ctx.FLOAT, false, this.step * 12, this.step * 4);
    this.ctx.vertexAttribPointer(this.MainProgram.aColor, 3, this.ctx.FLOAT, false, this.step * 12, this.step * 7);
    this.ctx.vertexAttribPointer(this.MainProgram.aUV, 2, this.ctx.FLOAT, false, this.step * 12, this.step * 10);

    this.ctx.uniformMatrix4fv(this.MainProgram.uProjection, false, this.projection);
    for (var i = 0; i < this.clockGeometry.nmeshes; i++) {
        this.ctx.uniformMatrix4fv(this.MainProgram.uModel[i], false, this.model[i]);
    }
    this.ctx.uniformMatrix4fv(this.MainProgram.uView, false, this.view);

    this.ctx.uniform3f(this.MainProgram.uLightPos, 0, 0, 10);


    this.ctx.activeTexture(this.ctx.TEXTURE0);
    this.ctx.bindTexture(this.ctx.TEXTURE_2D, this.clockTexture);
    this.ctx.uniform1i(this.MainProgram.uClockTexture, 0);

    this.ctx.activeTexture(this.ctx.TEXTURE1);
    this.ctx.bindTexture(this.ctx.TEXTURE_2D, this.OffscreenFBO.texture);
    this.ctx.uniform1i(this.MainProgram.uOffscreenFBO, 1);


    this.ctx.enable(this.ctx.DEPTH_TEST);
    this.ctx.drawElements(this.ctx.TRIANGLES, this.MainProgram.nelem, this.ctx.UNSIGNED_SHORT, 0);
};

ClockWidget.prototype.drawOffscreenFBO = function (now) {
    "use strict";

    // this.ctx.viewport(0, 0, this.canvas.width, this.canvas.height); same as regular viewport
    this.ctx.bindFramebuffer(this.ctx.FRAMEBUFFER, this.OffscreenFBO);
    this.ctx.clearColor(0.0, 0.0, 0.0, 1.0);
    this.ctx.clear(this.ctx.COLOR_BUFFER_BIT);

    this.ctx.useProgram(this.OffscreenProgram);
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.OffscreenProgram.vbuffer);

    this.ctx.enableVertexAttribArray(this.OffscreenProgram.aPos);
    this.ctx.vertexAttribPointer(this.OffscreenProgram.aPos, 4, this.ctx.FLOAT, false, 0, 0);

    for (var i = 0; i < 3; i++) {
        var offsetx = Math.sin(now + i) * (Math.cos(now + i) * 0.3 + 0.6);
        var offsety = Math.cos(now + i) * (Math.cos(now + i) * 0.3 + 0.6);

        this.ctx.uniform2f(this.OffscreenProgram.uLightPos[i], this.OffscreenProgram.LightPos[i][0] + offsetx,
            this.OffscreenProgram.LightPos[i][1] + offsety);

        this.ctx.uniform3f(this.OffscreenProgram.uLightColor[i], this.OffscreenProgram.LightColor[i][0],
            this.OffscreenProgram.LightColor[i][1],
            this.OffscreenProgram.LightColor[i][2]);

        this.ctx.uniform1f(this.OffscreenProgram.uLightSize[i], this.OffscreenProgram.LightSize[i]);
    }

    this.ctx.disable(this.ctx.DEPTH_TEST);
    this.ctx.drawArrays(this.ctx.TRIANGLES, 0, 6);
};

ClockWidget.prototype.loadClockGeometry = function (Program) {
    "use strict";

    var xhr = new XMLHttpRequest();
    xhr.addEventListener("load", function (e) {
        this.clockGeometry = JSON.parse(e.target.responseText);
        this.clockGeometry.nmeshes = this.clockGeometry.meshes.length;

        this.createOffscreenFBO();
        this.createMainProgram();
        this.createOffscreenProgram();
        this.initGeometry();
    }.bind(this));
    xhr.open("GET", this.modelUrl);
    xhr.send();
};

ClockWidget.prototype.initGeometry = function () {
    "use strict";

    mat4.perspective(this.projection, 45 / 180 * Math.PI, 1, 1, 50);

    var i, j, l,
        m = this.clockGeometry.meshes.length;

    for (i = 0; i < this.clockGeometry.nmeshes; i++) {
        this.model.push(mat4.create());
    }


    var vertices = [];
    var faces = [];
    var faceindex = 0;
    // for every mesh
    for (i = 0; i < m; i++) {
        var color = {
            r: Math.random(),
            g: Math.random(),
            b: Math.random()
        };

        for (j = 0, l = this.clockGeometry.meshes[i].vertices.length / 3; j < l; j++) {
            var s = 0, t = 0;
            if (this.clockGeometry.meshes[i].texturecoords) {
                s = this.clockGeometry.meshes[i].texturecoords[0][j * 2 + 0];
                t = this.clockGeometry.meshes[i].texturecoords[0][j * 2 + 1];
            }

            vertices.push(
                this.clockGeometry.meshes[i].vertices[j * 3 + 0],
                this.clockGeometry.meshes[i].vertices[j * 3 + 1],
                this.clockGeometry.meshes[i].vertices[j * 3 + 2],
                i,  // mesh identifier
                this.clockGeometry.meshes[i].normals[j * 3 + 0],
                this.clockGeometry.meshes[i].normals[j * 3 + 1],
                this.clockGeometry.meshes[i].normals[j * 3 + 2],
                this.colors[i][0] / 255, this.colors[i][1] / 255, this.colors[i][2] / 255,
                //color.r, color.g, color.b,
                s, t
            );
        }

        for (j = 0, l = this.clockGeometry.meshes[i].faces.length; j < l; j++) {
            faces.push(this.clockGeometry.meshes[i].faces[j][0] + faceindex,
                this.clockGeometry.meshes[i].faces[j][1] + faceindex,
                this.clockGeometry.meshes[i].faces[j][2] + faceindex);
        }

        faceindex += this.clockGeometry.meshes[i].vertices.length / 3;
    }

    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.MainProgram.vbuffer);
    this.ctx.bufferData(this.ctx.ARRAY_BUFFER, new Float32Array(vertices), this.ctx.STATIC_DRAW);

    this.ctx.bindBuffer(this.ctx.ELEMENT_ARRAY_BUFFER, this.MainProgram.ebuffer);
    this.ctx.bufferData(this.ctx.ELEMENT_ARRAY_BUFFER, new Uint16Array(faces), this.ctx.STATIC_DRAW);

    this.MainProgram.nelem = faces.length;
};

ClockWidget.prototype.mouseMove = function (e) {
    "use strict";

    this.br = this.DOMcontainer.getBoundingClientRect();
    if (this.br.top > innerHeight) return;

    // coordinates needs to be normalized to have the same rotation amplitude at different screen sizes
    this.cync = (this.br.top + this.DOMcontainer.clientHeight / 2) / innerHeight;
    this.cxnc = (this.br.left + this.DOMcontainer.clientWidth / 2) / innerWidth;
    this.lastXnc = e.clientX / innerWidth;
    this.lastYnc = e.clientY / innerHeight;

    this.updateClockAndMatrices();
};

ClockWidget.prototype.updateClockAndMatrices = function () {
    "use strict";

    var d = new Date();
    var seconds = d.getSeconds() + d.getMilliseconds() * 0.001;
    var minutes = d.getMinutes() + seconds / 60;
    var hours = d.getHours() + minutes / 60;
    var deg = 0;

    for (var i = 0; i < this.clockGeometry.nmeshes; i++) {
        mat4.identity(this.model[i]);

        //translate from eye
        mat4.translate(this.model[i], this.model[i], [0, 0, -12]);

        // rotate every mesh based on mouse position
        mat4.rotate(this.model[i], this.model[i], Math.PI * 0.15 * (this.lastYnc - this.cync), [1, 0, 0]);
        mat4.rotate(this.model[i], this.model[i], Math.PI * 0.15 * (this.lastXnc - this.cxnc), [0, 1, 0]);

        /* clock handles */
        if (i === 0 || i === 1 || i === 6 || i === 7) {
            // rotate clock's hand (seconds)
            switch (i) {
                case 0:
                    deg = (minutes / 60) * (Math.PI * 2);
                    break;

                case 1:
                case 6:
                    deg = (seconds / 60) * (Math.PI * 2);
                    break;

                case 7:
                    deg = (hours / 12) * (Math.PI * 2);
                    break;
            }

            mat4.rotate(this.model[i], this.model[i], -deg, [0, 0, 1]);
        }

        // first rotate the clock to face us
        mat4.rotate(this.model[i], this.model[i], Math.PI * 0.5, [1, 0, 0]);
    }
};



ClockWidget.prototype.load_texture = function (path, mipmap) {
    "use strict";

    var image = new Image();
    var texture = this.ctx.createTexture();
    image.onload = function retFunc(image, texture, mipmap, target) {

        return function onReceive() {

            this.ctx.bindTexture(this.ctx.TEXTURE_2D, texture);
            this.ctx.pixelStorei(this.ctx.UNPACK_FLIP_Y_WEBGL, true);
            this.ctx.texImage2D(this.ctx.TEXTURE_2D, 0, this.ctx.RGBA, this.ctx.RGBA, this.ctx.UNSIGNED_BYTE, image);
            this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_MAG_FILTER, this.ctx.LINEAR);
            this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_MIN_FILTER, this.ctx.LINEAR);
            this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_WRAP_S, this.ctx.CLAMP_TO_EDGE);
            this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_WRAP_T, this.ctx.CLAMP_TO_EDGE);

            if (mipmap) {
                this.ctx.generateMipmap(this.ctx.TEXTURE_2D);
                this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_MAG_FILTER, this.ctx.LINEAR);
                this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_MIN_FILTER, this.ctx.LINEAR_MIPMAP_LINEAR);
            }


            this.ctx.bindTexture(this.ctx.TEXTURE_2D, null);
        }.bind(target);
    }(image, texture, mipmap, this);

    image.src = path;
    return texture;
};

ClockWidget.prototype.onResize = function () {
    "use strict";

    this.canvas.width = this.DOMcontainer.clientWidth;
    this.canvas.height = this.DOMcontainer.clientHeight;
    this.ctx.viewport(0, 0, this.canvas.width, this.canvas.height);
};