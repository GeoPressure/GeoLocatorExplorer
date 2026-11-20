import { expect, test } from "vitest";
import { personDisplayName, personFamilyName } from "../src/lib/format";

test("shows contributors as Given Family", () => {
  expect(personDisplayName({ title: "Nussbaumer, Raphaël", givenName: "Raphaël", familyName: "Nussbaumer" })).toBe(
    "Raphaël Nussbaumer",
  );
  expect(personDisplayName({ title: "Bustillo-de la Rosa, Daniel" })).toBe("Daniel Bustillo-de la Rosa");
  expect(personDisplayName({ title: "Katie J. Galletta" })).toBe("Katie J. Galletta");
  expect(personDisplayName({ title: "Swiss Ornithological Institute" })).toBe("Swiss Ornithological Institute");
});

test("finds the family name for short credits", () => {
  expect(personFamilyName({ title: "Wong, Joanna", familyName: "Wong" })).toBe("Wong");
  expect(personFamilyName({ title: "Fernández Calvo, Ignacio" })).toBe("Fernández Calvo");
  expect(personFamilyName({ title: "Katie J. Galletta" })).toBe("Galletta");
});
