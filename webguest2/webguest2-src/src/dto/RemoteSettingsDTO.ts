// Reconstructed: the original type-only module was not part of the build output.
export interface RemoteSettingOption {
  value: string | boolean | number;
  label: string;
}

export interface RemoteSettingProps {
  name: string;
  fieldName: string;
  value: string | boolean | number | undefined;
  options?: RemoteSettingOption[];
}
