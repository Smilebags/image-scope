#version 300 es

in vec4 a_color;

uniform mat4 u_view_transform;
uniform int u_use_p3;
/**
u_position_colorspace {
   0: xyY
   1: XYZ
   2: sRGB

}
*/
// uniform int u_position_colorspace;

out vec4 v_color;

vec3 sRGBToRec709(vec3 c) {
  return pow(c, vec3(2.2));
}

vec3 diplayP3ToDCIP3(vec3 c) {
  return pow(c, vec3(2.2));
}

vec3 DCIP3TodiplayP3(vec3 c) {
  return pow(clamp(c, vec3(0.), vec3(1.)), vec3(1./2.2));
}

vec3 rec709TosRGB(vec3 c) {
  return pow(clamp(c, vec3(0.), vec3(1.)), vec3(1.0/2.2));
}

mat3 matRec709ToCIEXYZ = mat3(
0.4123908, 0.3575843, 0.1804808,
0.2126390, 0.7151687, 0.0721923,
0.0193308, 0.1191948, 0.9505322
);

mat3 matCIEXYZToRec709 = mat3(
3.2409699, -1.5373832, -0.4986108,
-0.9692436, 1.8759675, 0.0415551,
0.0556301, -0.2039770, 1.0569715
);

mat3 matDCIP3ToCIEXYZ = mat3(
  0.4865709, 0.2656677, 0.1982173,
  0.2289746, 0.6917385, 0.0792869,
  0.0000000, 0.0451134, 1.0439444
);

mat3 matCIEXYZToDCIP3 = mat3(
  2.4934969, -0.9313836, -0.4027108,
  -0.8294890, 1.7626641, 0.0236247,
  0.0358458, -0.0761724, 0.9568845
);

vec3 rec709ToCIEXYZ(vec3 c) {
  return c * matRec709ToCIEXYZ;
}

vec3 CIEXYZToRec709(vec3 c) {
  return c * matCIEXYZToRec709;
}

vec3 DCIP3ToCIEXYZ(vec3 c) {
  return c * matDCIP3ToCIEXYZ;
}

vec3 CIEXYZToDCIP3(vec3 c) {
  return c * matCIEXYZToDCIP3;
}

vec3 CIEXYZtoCIExyY(vec3 c) {
  float x = c.r / (c.r + c.g + c.b);
  float y = c.g / (c.r + c.g + c.b);
  return vec3(x, y, c.g);
}

void main()
{
  vec4 c = a_color;
  c = c * vec4(1.0 / 255.0);
  float a = c.a;
  c.a = 1.;
  if(u_use_p3 == 1) {
    c.rgb = diplayP3ToDCIP3(c.rgb);
    c.rgb = DCIP3ToCIEXYZ(c.rgb);
  } else {
    c.rgb = sRGBToRec709(c.rgb);
    c.rgb = rec709ToCIEXYZ(c.rgb);
  }

  vec4 a_position = vec4(CIEXYZtoCIExyY(c.rgb), c.a);
  vec4 position = u_view_transform * a_position;

  vec4 outColor = c;
  outColor.rgb = CIEXYZToRec709(outColor.rgb);
  outColor.rgb = rec709TosRGB(outColor.rgb);
  outColor.a = a;
  v_color = outColor;

  gl_Position = position;
  gl_Position.z = 0.0 - gl_Position.z;
  gl_Position.z = gl_Position.z / (gl_Position.z + 1.0);
  gl_Position.x = -gl_Position.x;
  gl_PointSize = 2.0;
}