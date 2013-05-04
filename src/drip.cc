#include <iostream>
#include <algorithm>
#include <fstream>
#include <vector>
#include <map>
#include <stdint.h>
#include <string>
#include "Node.h"

const char* fin_pages      = "../data/pages.txt";
const char* fin_links      = "../data/links.txt";
const char* fon_pages      = "../data/pages.bin";
const char* fon_links      = "../data/links.bin";
const char* fon_titles     = "../data/titles.txt";
const char* fon_rpages     = "../data/rpages.bin";
const char* fon_rlinks     = "../data/rlinks.bin";
const char* fon_redirects  = "../data/redirects.txt";

class Drip {
  private:
    uint32_t index;
    std::map<uint32_t, std::string> redirects;
    std::map<std::string, uint32_t> title2id;
    std::map<uint32_t, uint32_t> id2index;
    std::vector<uint32_t> index2id;
    std::vector<std::string> titles;
    std::vector<std::pair<uint32_t, uint32_t>> links;
    std::vector<std::pair<std::string, std::string>> redirect_titles;

    static bool sort_first(const std::pair<uint32_t, uint32_t> a, const std::pair<uint32_t, uint32_t> b) {
      return a.first < b.first;
    }

    static bool sort_second(const std::pair<uint32_t, uint32_t> a, const std::pair<uint32_t, uint32_t> b) {
      return a.second < b.second;
    }

    void add_page(uint32_t id, std::string title, bool is_redirect, std::string redirect) {
      title2id.insert(std::make_pair(title, id));
      if(is_redirect) {
        redirect_titles.push_back(std::make_pair(title, redirect));
        redirects.insert(std::make_pair(id, redirect));
      } else {
        id2index.insert(std::make_pair(id, index++));
        index2id.push_back(id);
        titles.push_back(title);
      }
    }

    void add_link(uint32_t from_id, std::string to_title) {
      uint32_t from_index, to_index;
      if(get_index(from_id, from_index) && get_index(to_title, to_index)) {
        links.push_back(std::make_pair(from_index, to_index));
      }
    }

  public:
    Drip(const char* fn_pages, const char* fn_links) : index(0) {
      std::ifstream ifs_pages(fn_pages);
      if(!ifs_pages) {
        std::cerr << fn_pages << " cannot open" << std::endl;
        return;
      }

      std::ifstream ifs_links(fn_links);
      if(!ifs_links) {
        std::cerr << fn_links << " cannot open" << std::endl;
        return;
      }

      while(true) {
        uint32_t id;
        bool is_redirect;
        std::string title;
        std::string redirect;
        ifs_pages >> id >> title >> is_redirect >> redirect;
        if(ifs_pages.eof()) break;
        add_page(id, title, is_redirect, redirect);
      }

      while(true) {
        uint32_t from_id;
        std::string to_title;
        ifs_links >> from_id >> to_title;
        if(ifs_links.eof()) break;
        add_link(from_id, to_title);
      }
      std::cout << id2index.size() << std::endl;
      std::cout << links.size() << std::endl;
      std::cout << redirects.size() << std::endl;
    }

    bool get_index(uint32_t id, uint32_t& index) const {
      auto redirect_it = redirects.find(id);
      if(redirect_it != redirects.end()) {
        return get_index(redirect_it->second, index);
      }

      auto it = id2index.find(id);
      if(it == id2index.end()) {
        return false;
      }
      index = it->second;
      return true;
    }

    bool get_index(std::string title, uint32_t& index) const {
      auto it = title2id.find(title);
      if(it == title2id.end()) {
        return false;
      }
      return get_index(it->second, index);
    }

    void write_titles(const char* fn) const {
      std::ofstream ofs(fn);
      if(!ofs) {
        std::cerr << fn << " cannot open" << std::endl;
        return;
      }
      for(auto it = titles.begin(); it != titles.end(); it++) {
        ofs << *it << std::endl;
      }
    }

    void write_redirects(const char* fn) const {
      std::ofstream ofs(fn);
      if(!ofs) {
        std::cerr << fn << " cannot open" << std::endl;
        return;
      }
      for(auto it = redirect_titles.begin(); it != redirect_titles.end(); it++) {
        uint32_t to_index;
        if(get_index(it->second, to_index)) {
          ofs << it->first << " " << to_index << std::endl;
        }
      }
    }

    void write_nodes_links(const char* fn_nodes, const char* fn_links, const bool reverse = false) const {
      std::ofstream ofs_nodes(fn_nodes);
      if(!ofs_nodes) {
        std::cerr << fn_nodes << " cannot open" << std::endl;
        return;
      }

      std::ofstream ofs_links(fn_links);
      if(!ofs_links) {
        std::cerr << fn_links << " cannot open" << std::endl;
        return;
      }

      std::vector<std::pair<uint32_t, uint32_t>> tmp_links;
      tmp_links.reserve(links.size());
      std::copy(links.begin(), links.end(), std::back_inserter(tmp_links));
      std::sort(tmp_links.begin(), tmp_links.end(), reverse? sort_second : sort_first);

      uint32_t link_size = tmp_links.size();
      ofs_links.write((char*) &link_size, sizeof(uint32_t));
      for(auto it = tmp_links.begin(); it != tmp_links.end(); it++) {
        uint32_t link = reverse? it->first : it->second;
        ofs_links.write((char*) &link, sizeof(uint32_t));
      }

      uint32_t node_size = index2id.size();
      Node* nodes = new Node[node_size];
      uint32_t start = 0, current = reverse? tmp_links[0].second : tmp_links[0].first;
      for(uint32_t i = 0; i < link_size; i++) {
        uint32_t index = reverse? tmp_links[i].second : tmp_links[i].first;
        if(current != index) {
          nodes[current].link_start = start;
          nodes[current].link_end = start = i;
          current = index;
        }
      }
      nodes[current].link_start = start;
      nodes[current].link_end = node_size;

      ofs_nodes.write((char*) &node_size, sizeof(uint32_t));
      ofs_nodes.write((char*) nodes, sizeof(Node) * node_size);

      delete [] nodes;
    }
};

int main(int argc, char const* argv[]) {
  Drip drip(fin_pages, fin_links);
  drip.write_titles(fon_titles);
  drip.write_redirects(fon_redirects);
  drip.write_nodes_links(fon_pages, fon_links);
  drip.write_nodes_links(fon_rpages, fon_rlinks, true);
  return 0;
}
