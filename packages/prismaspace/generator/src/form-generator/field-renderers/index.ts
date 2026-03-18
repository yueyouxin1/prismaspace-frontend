import type { FieldRendererDescriptor } from "../types"
import AccordionField from "./accordion/AccordionField.vue"
import AccordionItemField from "./accordion/AccordionItemField.vue"
import AccordionRootField from "./accordion/AccordionRootField.vue"
import { accordionFieldDescriptors } from "./accordion/descriptor"
import CheckboxField from "./checkbox/CheckboxField.vue"
import { checkboxFieldDescriptors } from "./checkbox/descriptor"
import CheckboxGroupField from "./checkbox-group/CheckboxGroupField.vue"
import { checkboxGroupFieldDescriptors } from "./checkbox-group/descriptor"
import ComboboxField from "./combobox/ComboboxField.vue"
import { comboboxFieldDescriptors } from "./combobox/descriptor"
import DateRangeField from "./date-range/DateRangeField.vue"
import { dateRangeFieldDescriptors } from "./date-range/descriptor"
import FormItemRenderer from "./FormItemRenderer.vue"
import InputField from "./text-input/InputField.vue"
import { textInputFieldDescriptors } from "./text-input/descriptor"
import InputOtpField from "./input-otp/InputOtpField.vue"
import { inputOtpFieldDescriptors } from "./input-otp/descriptor"
import NativeSelectField from "./native-select/NativeSelectField.vue"
import { nativeSelectFieldDescriptors } from "./native-select/descriptor"
import NumberFieldField from "./number-field/NumberFieldField.vue"
import { numberFieldDescriptors } from "./number-field/descriptor"
import RadioGroupField from "./radio-group/RadioGroupField.vue"
import { radioGroupFieldDescriptors } from "./radio-group/descriptor"
import RangeField from "./slider/RangeField.vue"
import { sliderFieldDescriptors } from "./slider/descriptor"
import SelectField from "./select/SelectField.vue"
import { selectFieldDescriptors } from "./select/descriptor"
import SwitchField from "./switch/SwitchField.vue"
import { switchFieldDescriptors } from "./switch/descriptor"
import TabsItemField from "./tabs/TabsItemField.vue"
import TabsRootField from "./tabs/TabsRootField.vue"
import { tabsFieldDescriptors } from "./tabs/descriptor"
import TagsField from "./tags-input/TagsField.vue"
import { tagsInputFieldDescriptors } from "./tags-input/descriptor"
import TextareaField from "./textarea/TextareaField.vue"
import { textareaFieldDescriptors } from "./textarea/descriptor"
import UnsupportedField from "./UnsupportedField.vue"

export {
  AccordionField,
  AccordionItemField,
  AccordionRootField,
  CheckboxField,
  CheckboxGroupField,
  ComboboxField,
  DateRangeField,
  FormItemRenderer,
  InputField,
  InputOtpField,
  NativeSelectField,
  NumberFieldField,
  RadioGroupField,
  RangeField,
  SelectField,
  SwitchField,
  TabsItemField,
  TabsRootField,
  TagsField,
  TextareaField,
  UnsupportedField,
}

export {
  accordionFieldDescriptors,
  checkboxFieldDescriptors,
  checkboxGroupFieldDescriptors,
  comboboxFieldDescriptors,
  dateRangeFieldDescriptors,
  inputOtpFieldDescriptors,
  nativeSelectFieldDescriptors,
  numberFieldDescriptors,
  radioGroupFieldDescriptors,
  selectFieldDescriptors,
  sliderFieldDescriptors,
  switchFieldDescriptors,
  tabsFieldDescriptors,
  tagsInputFieldDescriptors,
  textInputFieldDescriptors,
  textareaFieldDescriptors,
}

export const builtInFieldDescriptors: FieldRendererDescriptor[] = [
  ...textInputFieldDescriptors,
  ...textareaFieldDescriptors,
  ...selectFieldDescriptors,
  ...nativeSelectFieldDescriptors,
  ...comboboxFieldDescriptors,
  ...checkboxFieldDescriptors,
  ...checkboxGroupFieldDescriptors,
  ...switchFieldDescriptors,
  ...radioGroupFieldDescriptors,
  ...sliderFieldDescriptors,
  ...numberFieldDescriptors,
  ...dateRangeFieldDescriptors,
  ...tagsInputFieldDescriptors,
  ...inputOtpFieldDescriptors,
  ...accordionFieldDescriptors,
  ...tabsFieldDescriptors,
]
