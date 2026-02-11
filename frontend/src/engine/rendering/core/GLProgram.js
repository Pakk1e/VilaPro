export default class GLProgram {
    constructor(gl, vsSource, fsSource) {
        this.gl = gl;
        this.program = this.create(vsSource, fsSource);
    }

    create(vs, fs) {
        const gl = this.gl;

        const compile = (type, src) => {
            const s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                console.error(gl.getShaderInfoLog(s));
            }
            return s;
        };

        const p = gl.createProgram();
        gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
        gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
        gl.linkProgram(p);

        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(p));
        }

        return p;
    }

    use() {
        this.gl.useProgram(this.program);
    }
}
