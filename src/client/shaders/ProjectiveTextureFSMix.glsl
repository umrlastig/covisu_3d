#include <itowns/WebGL2_pars_fragment>
#include <itowns/precision_qualifier>
#include <logdepthbuf_pars_fragment>
#include <itowns/projective_texturing_pars_fragment>
varying vec3 vNormal;

#ifdef USE_BASE_MATERIAL
struct noPT {
    vec3 lightDirection;
    vec3 ambient;
    float opacity;
};

uniform noPT noProjectiveMaterial;
#endif

uniform float interpolation;
uniform vec3 baseColor; 

void main(void)
{
    #include <logdepthbuf_fragment>
    // #ifdef USE_BASE_MATERIAL
    // float nDotVP = (max(0.1, dot(vNormal, normalize(noProjectiveMaterial.lightDirection))));
    // vec4 color = vec4(noProjectiveMaterial.ambient + nDotVP, 0.0);
    // #else
    // vec4 color = vec4(0.0);
    // #endif
    vec4 color = vec4(0.0);
    #pragma unroll_loop
    for (int i = 0; i < ORIENTED_IMAGES_COUNT; i++) {
        color = projectiveTextureColor(projectiveTextureCoords[ ORIENTED_IMAGES_COUNT - 1 - i ], projectiveTextureDistortion[ ORIENTED_IMAGES_COUNT - 1 - i ], projectiveTexture[ ORIENTED_IMAGES_COUNT - 1 - i ], mask[ORIENTED_IMAGES_COUNT - 1 - i], color);
    }

    // #ifdef USE_BASE_MATERIAL
    //color.a = color.a < 1.0 ? max(noProjectiveMaterial.opacity, color.a) : 1.0 ;
    //gl_FragColor = vec4(color.rgb, color.a * opacity);
    float nDotVPi = (max(0.1, dot(vNormal, normalize(noProjectiveMaterial.lightDirection))));
    vec4 colorbase = vec4((noProjectiveMaterial.ambient+nDotVPi)*baseColor.rgb, 0.0);
    //vec4 colorbase = vec4((vec3(0.5,0.5,0.5) + nDotVPi)*baseColor.rgb, 0.0);
    vec3 result = color.rgb * (1.0-interpolation) + colorbase.rgb * interpolation; 
    gl_FragColor = vec4(result, opacity);
    //gl_FragColor = vec4(noProjectiveMaterial.ambient,1.0);
    
    // #else
    // //gl_FragColor = vec4(color.rgb / color.a, opacity);
    // vec3 result = color.rgb * (1.0-interpolation) + baseColor.rgb * interpolation; 
    // gl_FragColor = vec4(result, opacity);
    // //gl_FragColor = vec4(interpolation, interpolation, interpolation, 1.0);
    // //gl_FragColor = vec4(1.0,0.0,1.0,1.0);
    // #endif

}