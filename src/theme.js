import { extendTheme } from '@chakra-ui/react';

const config = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const colors = {
  brand: {
    50: '#e6f7ff',
    100: '#b3e0ff',
    200: '#80caff',
    300: '#4db3ff',
    400: '#1a9dff',
    500: '#0084ff',
    600: '#0066cc',
    700: '#004d99',
    800: '#003366',
    900: '#001a33',
  },
};

const fonts = {
  body: 'Inter, system-ui, sans-serif',
  heading: 'Inter, system-ui, sans-serif',
  mono: 'Menlo, monospace',
};

const styles = {
  global: (props) => ({
    'html, body, #root': {
      height: '100%',
      width: '100%',
      margin: 0,
      padding: 0,
      bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
    },
    '*, *::before, &::after': {
      boxSizing: 'border-box',
    },
    '::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '::-webkit-scrollbar-track': {
      bg: props.colorMode === 'dark' ? 'gray.800' : 'gray.100',
    },
    '::-webkit-scrollbar-thumb': {
      bg: props.colorMode === 'dark' ? 'gray.600' : 'gray.300',
      borderRadius: '4px',
      '&:hover': {
        bg: props.colorMode === 'dark' ? 'gray.500' : 'gray.400',
      },
    },
  }),
};

const components = {
  Button: {
    baseStyle: {
      fontWeight: 'medium',
      borderRadius: 'md',
      _focus: {
        boxShadow: '0 0 0 3px var(--chakra-colors-blue-200)',
      },
    },
    sizes: {
      md: {
        h: 10,
        minW: 10,
        fontSize: 'md',
        px: 4,
      },
    },
  },
  Input: {
    baseStyle: {
      field: {
        _focus: {
          borderColor: 'blue.500',
          boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)',
        },
      },
    },
  },
};

const theme = extendTheme({
  config,
  colors,
  fonts,
  styles,
  components,
});

export default theme;
