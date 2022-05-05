#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D tex;
uniform vec4 color;
uniform float t;

varying vec2 texCoord;

void main(void)
{
    vec3 result;
    vec4 colorText = texture2D(tex, texCoord);
    result = colorText.rgb * (1.0-t) + color.rgb * t; 
     // blending equation
    gl_FragColor= vec4(result, colorText.a*(1.0-t)+color.a*t);
    //gl_FragColor=vec4(t,0,0,1);
}