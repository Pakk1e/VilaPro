attribute vec2 a_position;

varying vec2 v_uv;

void main() {
    // convert quad 0..1 to clip space
    gl_Position = vec4(a_position * 2.0 - 1.0, 0.0, 1.0);

    // UV with origin top-left
    v_uv = vec2(a_position.x, 1.0 - a_position.y);
}
