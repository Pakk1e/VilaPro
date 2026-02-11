precision highp float;

uniform sampler2D u_dataTexture;
uniform sampler2D u_lut;

uniform vec2 u_worldMin;
uniform vec2 u_worldMax;

varying vec2 v_uv;

const float PI = 3.141592653589793;

float mercatorYToLat(float y) {
    float latRad = 2.0 * atan(exp(PI * (1.0 - 2.0 * y))) - PI / 2.0;
    return degrees(latRad);
}

void main() {
    // Convert screen → world
    float worldX = mix(u_worldMin.x, u_worldMax.x, v_uv.x);
    float worldY = mix(u_worldMin.y, u_worldMax.y, v_uv.y);

    // infinite wrap
    float tx = fract(worldX + 0.5);

    // Mercator → latitude
    float lat = mercatorYToLat(worldY);

    // latitude → data texture
    float ty = (90.0 - lat) / 180.0;
    ty = clamp(ty, 0.0, 1.0);

    float dataVal = texture2D(u_dataTexture, vec2(tx, ty)).r;

    vec4 color = texture2D(u_lut, vec2(dataVal, 0.5));



    gl_FragColor = vec4(color.rgb, 0.85);
}
