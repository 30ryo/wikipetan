CC      = g++
CFLAGS  = -O4 -std=c++0x -Wall
OUTDIR  = ../bin
all: $(OUTDIR) $(OUTDIR)/drip $(OUTDIR)/main

$(OUTDIR):
	mkdir $(OUTDIR)

$(OUTDIR)/drip: drip.cc
	$(CC) $(CFLAGS) -o $@ $<

$(OUTDIR)/main: main.cc
	$(CC) $(CFLAGS) -o $@ $<

