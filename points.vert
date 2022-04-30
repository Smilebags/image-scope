#version 300 es

// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
// in vec4 a_position;
in vec4 a_color;

uniform vec2 u_resolution;
uniform mat4 u_view_transform;

out vec4 v_color;

vec3 sRGBToRec709(vec3 c) {
  return pow(c, vec3(2.2));
}

vec3 rec709TosRGB(vec3 c) {
  return pow(c, vec3(1.0/2.2));
}

vec3 rec709ToCIEXYZ(vec3 c) {
  float X = c.r * 0.4124 + c.g * 0.3576 + c.b * 0.1805;
  float Y = c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
  float Z = c.r * 0.0193 + c.g * 0.1192 + c.b * 0.9505;
  return vec3(X, Y, Z);
}

vec3 CIEXYZtoCIExyY(vec3 c) {
  float x = c.r / (c.r + c.g + c.b);
  float y = c.g / (c.r + c.g + c.b);
  return vec3(x, y, c.g);
}

// all shaders have a main function
void main()
{
  vec4 c = a_color;
  c = c * vec4(1.0 / 255.0);
  c.rgb = sRGBToRec709(c.rgb);

  vec4 a_position = vec4(CIEXYZtoCIExyY(rec709ToCIEXYZ(c.rgb)), c.a);
  vec4 position = u_view_transform * a_position;

  vec4 outColor = c;
  outColor.rgb = rec709TosRGB(outColor.rgb);
  v_color = outColor;

  gl_Position = position;
  gl_Position.z = 0.0 - gl_Position.z;
  gl_Position.z = gl_Position.z / (gl_Position.z + 1.0);
  gl_Position.x = -gl_Position.x;
  gl_PointSize = 3.0;
}