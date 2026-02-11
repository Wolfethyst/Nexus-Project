import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

export const system = createSystem(defaultConfig, defineConfig({
  theme: {
    tokens: {
      fonts: {
        heading: { value: "'Cinzel', serif" },
        body: { value: "'Marcellus', serif" },
      },
    },
  },
}))