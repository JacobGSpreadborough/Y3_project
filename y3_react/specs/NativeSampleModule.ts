import { TurboModule, TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
	readonly rnnoise_process_frame_wrapper: (input: number[]) => number[];
	readonly rnnoise_init_wrapper: () => void;
	readonly rnnoise_destroy_wrapper: () => void;
	readonly rnnoise_checkhealth: () => string;
}


export default TurboModuleRegistry.getEnforcing<Spec>(
	'NativeSampleModule',
);
