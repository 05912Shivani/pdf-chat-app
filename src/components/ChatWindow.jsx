import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Flex,
  Input,
  Button,
  Text,
  VStack,
  HStack,
  IconButton,
  useColorModeValue,
  useColorMode,
  InputGroup,
  InputRightElement,
  Tooltip,
  Spinner,
  Avatar,
  Heading,
  Fade,
  keyframes,
} from '@chakra-ui/react';
import { AttachmentIcon, SunIcon, MoonIcon } from '@chakra-ui/icons';
import { FiSend } from 'react-icons/fi';

const typing = keyframes`
  0% { content: '.'; }
  33% { content: '..'; }
  66% { content: '...'; }
`;

const Message = ({ message, isUser }) => {
  const bgColor = isUser ? 'blue.500' : useColorModeValue('gray.100', 'gray.700');
  const textColor = isUser ? 'white' : useColorModeValue('gray.800', 'whiteAlpha.900');
  const alignSelf = isUser ? 'flex-end' : 'flex-start';
  const borderRadius = isUser ? '18px 18px 0 18px' : '18px 18px 18px 0';

  return (
    <Flex maxW="80%" alignSelf={alignSelf} mb={3} direction="column">
      {/* Sender label */}
      <Text fontSize="xs" color="gray.500" mb={1} textAlign={isUser ? 'right' : 'left'}>
        {isUser ? 'You' : 'AI'}
      </Text>

      <Box
        bg={bgColor}
        color={textColor}
        px={4}
        py={2}
        borderRadius={borderRadius}
        boxShadow="md"
      >
        <Text whiteSpace="pre-wrap">{message.content}</Text>
      </Box>

      <Text fontSize="xs" color="gray.500" mt={1} textAlign={isUser ? 'right' : 'left'}>
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </Flex>
  );
};

const ChatWindow = ({ messages, onSendMessage, onFileUpload, isLoading, fileInputRef }) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  const { colorMode, toggleColorMode } = useColorMode();

  const bgPattern = useColorModeValue(
    'linear-gradient(135deg, #f7fafc 25%, #edf2f7 100%)',
    'linear-gradient(135deg, #1a202c 25%, #2d3748 100%)'
  );
  const inputBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) onFileUpload(file);
    e.target.value = null;
  };

  return (
    <Flex direction="column" h="100%" bg={bgPattern} position="relative">
      {/* Header with Light/Dark Toggle */}
      <Flex
        p={4}
        borderBottom="1px"
        borderColor={borderColor}
        align="center"
        justify="space-between"
        bg={useColorModeValue('white', 'gray.900')}
        boxShadow="sm"
        position="sticky"
        top={0}
        zIndex={10}
      >
        <HStack spacing={3}>
          <Avatar size="sm" name="PDF Assistant" />
          <Heading fontSize="md" fontWeight="semibold" display="flex" alignItems="center">
            <AttachmentIcon mr={2} /> PDF Assistant
          </Heading>
        </HStack>

        {/* 🌞 / 🌙 Toggle Button */}
        <Tooltip label={`Switch to ${colorMode === 'light' ? 'Dark' : 'Light'} Mode`}>
          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            variant="ghost"
            size="sm"
          />
        </Tooltip>
      </Flex>

      {/* Messages */}
      <Box flex={1} p={4} overflowY="auto">
        <VStack spacing={4} align="stretch">
          {messages.length === 0 ? (
            <Flex h="100%" align="center" justify="center" textAlign="center" color="gray.500">
              <Box>
                <Text fontSize="xl" fontWeight="medium" mb={2}>
                  Start a conversation
                </Text>
                <Text>Upload a PDF or type a message to begin</Text>
              </Box>
            </Flex>
          ) : (
            messages.map((msg) => <Message key={msg.id} message={msg} isUser={msg.sender === 'user'} />)
          )}

          {isLoading && (
            <Flex justify="flex-start" mb={4}>
              <Box
                bg={useColorModeValue('gray.200', 'gray.700')}
                px={4}
                py={2}
                borderRadius="18px 18px 18px 0"
                fontSize="sm"
                fontStyle="italic"
                position="relative"
              >
                Thinking<span style={{ animation: `${typing} 1s infinite steps(1)` }} />
              </Box>
            </Flex>
          )}

          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      {/* Input */}
      <Box p={4} borderTop="1px" borderColor={borderColor} bg={useColorModeValue('white', 'gray.900')}>
        <form onSubmit={handleSubmit}>
          <InputGroup size="md">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              display="none"
            />
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              bg={inputBg}
              borderRadius="full"
              borderColor={borderColor}
              _focus={{
                borderColor: 'blue.500',
                boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)',
              }}
              pr="90px"
            />
            <InputRightElement width="auto" mr={1}>
              <HStack spacing={1}>
                <Tooltip label="Upload PDF" placement="top">
                  <IconButton
                    aria-label="Upload PDF"
                    icon={<AttachmentIcon />}
                    size="sm"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                  />
                </Tooltip>
                <Button
                  type="submit"
                  colorScheme="blue"
                  size="sm"
                  borderRadius="full"
                  rightIcon={<FiSend />}
                  isLoading={isLoading}
                  isDisabled={!message.trim()}
                >
                  Send
                </Button>
              </HStack>
            </InputRightElement>
          </InputGroup>
        </form>
      </Box>
    </Flex>
  );
};

export default ChatWindow;
