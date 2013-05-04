#include <iostream>
#include <stdint.h>
#include <fstream>
#include <queue>
#include "Node.h"

void mapping(const uint32_t start, const Node* nodes, const uint32_t* links, uint8_t* map) {
  std::queue<uint32_t> queue;
  map[start] = 1;
  queue.push(start);
  while(!queue.empty()) {
    uint32_t n = queue.front();
    queue.pop();
    for(uint32_t i = nodes[n].link_start; i < nodes[n].link_end; ++i) {
      if(!map[links[i]] || map[links[i]] > map[n]) {
        if(map[links[i]] == 0) {
          queue.push(links[i]);
        }
        map[links[i]] = map[n] + 1;
      }
    }
  }
}

void routing(const uint32_t end, const Node* rnodes, const uint32_t* rlinks, uint8_t* map) {
  uint32_t n = end;
  if(map[n] != 0) {
    while(map[n] > 1) {
      std::cout << n << ",";
      for(uint32_t i = rnodes[n].link_start; i < rnodes[n].link_end; i++) {
        if(map[n] == map[rlinks[i]] + 1) {
          n = rlinks[i];
          break;
        }
      }
    }
  }
  std::cout << n << std::endl;
}

int main(int argc, char const* argv[]) {
  uint32_t node_size;
  std::ifstream ifs_nodes("../data/pages.bin", std::ios::binary);
  ifs_nodes.read((char*) &node_size, sizeof(uint32_t));
  Node* nodes = new Node[node_size];
  ifs_nodes.read((char*) nodes, sizeof(Node) * node_size);

  uint32_t link_size;
  std::ifstream ifs_links("../data/links.bin", std::ios::binary);
  ifs_links.read((char*) &link_size, sizeof(uint32_t));
  uint32_t* links = new uint32_t[link_size];
  ifs_links.read((char*) links, sizeof(uint32_t) * link_size);

  std::ifstream ifs_rlinks("../data/rlinks.bin", std::ios::binary);
  ifs_rlinks.read((char*) &link_size, sizeof(uint32_t));
  uint32_t* rlinks = new uint32_t[link_size];
  ifs_rlinks.read((char*) rlinks, sizeof(uint32_t) * link_size);

  std::ifstream ifs_rnodes("../data/rpages.bin", std::ios::binary);
  ifs_rnodes.read((char*) &node_size, sizeof(uint32_t));
  Node* rnodes = new Node[node_size];
  ifs_rnodes.read((char*) rnodes, sizeof(Node) * node_size);

  uint8_t* map = new uint8_t[node_size];
  while(true) {
    uint32_t start, end;
    std::cin >> start;
    std::cin >> end;
    for(uint32_t i = 0; i < node_size; ++i) { map[i] = 0; }
    mapping(start, nodes, links, map);
    routing(end, rnodes, rlinks, map);
  }

  delete [] nodes;
  delete [] links;
  delete [] map;
  delete [] rnodes;
  delete [] rlinks;
  return 0;
}
