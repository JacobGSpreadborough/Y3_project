#include "rnnoise.h"
#define FRAME_SIZE 480

DenoiseState* st;

void rnnoise_init_wrapper() {
	st = rnnoise_create(NULL);
}

void rnnoise_destroy_wrapper() {
	rnnoise_destroy(st);
}

void rnnoise_process_frame_wrapper(float* input) {
	for(int i = 0; i<FRAME_SIZE; i++) {
		input[i] *= 32767.0f;
	}

	rnnoise_process_frame(st, input, input);

	for( int i=0; i<FRAME_SIZE; i++) {
		input[i] /= 32767.0f;
	}
}
