#version 300 es

// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec4 a_position;
in vec4 a_color;

uniform vec2 u_resolution;
uniform mat4 u_view_transform;

out vec4 v_color;

// all shaders have a main function
void main()
{
  vec4 position = u_view_transform * a_position;
  v_color = a_color;
  gl_Position = position;
  gl_Position.z = 0.0 - gl_Position.z;
  gl_Position.z = gl_Position.z / (gl_Position.z + 1.0);
  gl_Position.x = -gl_Position.x;
  gl_PointSize = 3.0;
}