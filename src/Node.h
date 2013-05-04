#ifndef WIKIPETAN_NODE_H
#define WIKIPETAN_NODE_H

#include <stdint.h>

struct Node {
  Node() : link_start(0), link_end(0) { }
  uint32_t link_start;
  uint32_t link_end;
};

#endif
