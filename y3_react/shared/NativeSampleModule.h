
#pragma once

#include <AppSpecsJSI.h>

#include <memory>
#include <string>
#include "rnnoise.h"

namespace facebook::react {

class NativeSampleModule : public NativeSampleModuleCxxSpec<NativeSampleModule> {
private:
  DenoiseState* st;
public:
  NativeSampleModule(std::shared_ptr<CallInvoker> jsInvoker);

  std::vector<float> rnnoise_process_frame_wrapper(jsi::Runtime& rt, std::vector<float> input);
  void rnnoise_init_wrapper(jsi::Runtime& rt);
  void rnnoise_destroy_wrapper(jsi::Runtime& rt);
//  void foo(jsi::Runtime& rt, jsi::ArrayBuffer input);
  std::string rnnoise_checkhealth(jsi::Runtime& rt);
};

} // namespace facebook::react
