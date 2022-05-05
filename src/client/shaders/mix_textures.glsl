#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D fromTexture;
uniform sampler2D toTexture;
uniform float t;

varying vec2 texCoord;

void main(void)
{
    vec3 result;
    vec4 colorFrom = texture2D(fromTexture, texCoord);
    vec4 colorTo = texture2D(toTexture, texCoord);
    result = colorFrom.rgb * (1.0-t) + colorTo.rgb * t; 
     // blending equation
    gl_FragColor= vec4(result, colorFrom.a*(1.0-t)+colorTo.a*t);
    //gl_FragColor = colorFrom;
}