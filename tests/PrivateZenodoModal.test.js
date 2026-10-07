import { afterEach, beforeEach, expect, test } from "vitest";
import { mount } from "@vue/test-utils";
import PrivateZenodoModal from "../src/components/PrivateZenodoModal.vue";

let wrapper;
beforeEach(() => { wrapper = mount(PrivateZenodoModal, { props: { modelValue: true } }); });
afterEach(() => wrapper.unmount());

test.each([
  ["", false],
  ["https://zenodo.org/records/", false],
  ["123", true],
  ["10.5281/zenodo.123", true],
  ["https://doi.org/10.5281/zenodo.123", true],
  ["https://zenodo.org/records/123", true],
  ["https://zenodo.org/records/123?token=", true],
  ["https://zenodo.org/records/123?token=share-secret", false],
  ["https://zenodo.org/records/123?download=1&token=share-secret", false],
])("shows the token input appropriately for %s", async (recordInput, visible) => {
  await wrapper.setProps({ recordInput });
  expect(wrapper.find('[name="zenodo_token"]').exists()).toBe(visible);
});

test.each([
  ["123", "https://zenodo.org/records/123"],
  ["https://doi.org/10.5281/zenodo.123", "https://zenodo.org/records/123"],
  ["https://zenodo.org/records/123?token=share-secret", "https://zenodo.org/records/123?token=share-secret"],
])("opens the record link for %s", async (recordInput, url) => {
  await wrapper.setProps({ recordInput });
  const link = wrapper.get('[aria-label="Open entered record on Zenodo"]');
  expect(link.attributes("href")).toBe(url);
  expect(link.attributes("target")).toBe("_blank");
  expect(link.attributes("rel")).toBe("noreferrer");
});

test("does not offer a record link for an empty input", () => {
  expect(wrapper.find('[aria-label="Open entered record on Zenodo"]').exists()).toBe(false);
});

test("does not close when selection starts in the input and ends on the backdrop", async () => {
  await wrapper.get("input").trigger("pointerdown");
  await wrapper.trigger("click");
  expect(wrapper.emitted("update:modelValue")).toBeUndefined();
});

test("closes on a click that starts on the backdrop", async () => {
  await wrapper.trigger("pointerdown");
  await wrapper.trigger("click");
  expect(wrapper.emitted("update:modelValue")).toEqual([[false]]);
});

test("disables submit while downloading and when the input is blank", async () => {
  expect(wrapper.get('[type="submit"]').attributes("disabled")).toBeDefined();
  await wrapper.setProps({ recordInput: "123" });
  expect(wrapper.get('[type="submit"]').attributes("disabled")).toBeUndefined();
  await wrapper.setProps({ isProcessing: true });
  expect(wrapper.get('[type="submit"]').attributes("disabled")).toBeDefined();
});
