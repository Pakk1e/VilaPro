#extension GL_OES_standard_derivatives : enable
precision highp float;

varying vec2 v_uv;
uniform sampler2D u_tex;
uniform sampler2D u_lut;
uniform vec4 u_mapBounds;

const float PI = 3.14159265359;

float latToMerc(float lat) {
    float r = lat * PI / 180.0;
    return log(tan(PI * 0.25 + r * 0.5));
}

float mercToLat(float y) {
    return (2.0 * atan(exp(y)) - PI * 0.5) * 180.0 / PI;
}

void main() {
    // 1. PROJECT COORDINATES (Fixes Pole Alignment)
    float lon = mix(u_mapBounds.z, u_mapBounds.w, v_uv.x);
    float u = mod(lon + 360.0, 360.0) / 360.0;
    
    float mercSouth = latToMerc(u_mapBounds.x);
    float mercNorth = latToMerc(u_mapBounds.y);
    float mercY = mix(mercSouth, mercNorth, v_uv.y);
    float lat = mercToLat(mercY);
    float v = (lat + 90.0) / 180.0;

    if (v < 0.0 || v > 1.0) discard;

    // 2. SAMPLE & INTERPOLATE DATA
   float t = texture2D(u_tex, vec2(u, v)).r;
    
    // 2. Cubic Smoothing (Removes pixel blocks)
    t = smoothstep(0.0, 1.0, t);

    // 3. Color Lookup
    vec3 color = texture2D(u_lut, vec2(t, 0.5)).rgb;

    // 4. NATURAL BLENDING (Don't over-saturate)
    // ZoomEarth looks natural because it doesn't push luma too hard
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(luma), color, 1.1); // Reduced from 1.4 to 1.1

    // 5. SHARP ISOLINES
    #ifdef GL_OES_standard_derivatives
        float lineFreq = 40.0; // More lines for pro look
        float d = fwidth(t * lineFreq);
        float isoline = 1.0 - smoothstep(0.0, d * 2.0, abs(fract(t * lineFreq - 0.5) - 0.5));
        // Use a dark isoline for heat, light for cold
        vec3 lineCol = t > 0.5 ? vec3(0.0) : vec3(1.0);
        color = mix(color, lineCol, isoline * 0.1);
    #endif

    gl_FragColor = vec4(color, 1.0); // Opacity is handled by CSS mix-blend-mode
}