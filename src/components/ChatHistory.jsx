import { Box, VStack, Button, Text, HStack, IconButton, useColorModeValue, Tooltip } from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { format } from 'date-fns';

const ChatHistory = ({ chats, activeChat, onSelectChat, onCreateNewChat, onDeleteChat }) => {
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const activeBgColor = useColorModeValue('blue.50', 'blue.900');
  const hoverBgColor = useColorModeValue('gray.100', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box
      w="280px"
      h="100vh"
      borderRight="1px"
      borderColor={borderColor}
      bg={bgColor}
      overflowY="auto"
      display="flex"
      flexDirection="column"
    >
      {/* New Chat Button */}
      <Box p={4} borderBottom="1px" borderColor={borderColor}>
        <Button
          leftIcon={<AddIcon />}
          colorScheme="blue"
          size="sm"
          width="100%"
          onClick={onCreateNewChat}
        >
          New Chat
        </Button>
      </Box>

      {/* Chat List */}
      <VStack spacing={1} p={2} flex={1} overflowY="auto">
        {chats.length > 0 ? (
          chats.map((chat) => (
            <HStack
              key={chat.id}
              w="100%"
              p={3}
              borderRadius="md"
              cursor="pointer"
              bg={activeChat === chat.id ? activeBgColor : 'transparent'}
              _hover={{ bg: activeChat === chat.id ? activeBgColor : hoverBgColor }}
              justify="space-between"
              align="center"
              onClick={() => onSelectChat(chat.id)}
              position="relative"
              role="group"
            >
              {/* Chat Title with Tooltip */}
              <Box flex="1" minW={0}>
                <Tooltip label={chat.title} hasArrow>
                  <Text
                    fontWeight="medium"
                    isTruncated
                    color={activeChat === chat.id ? 'blue.500' : 'inherit'}
                    noOfLines={1}
                  >
                    {chat.title}
                  </Text>
                </Tooltip>
                <Text fontSize="xs" color="gray.500" mt={1} isTruncated>
                  {format(new Date(chat.createdAt), 'MMM d, yyyy h:mm a')}
                </Text>
              </Box>

              {/* Delete Button (only visible on hover) */}
              <IconButton
                aria-label="Delete chat"
                icon={<DeleteIcon />}
                size="xs"
                variant="ghost"
                colorScheme="red"
                onClick={(e) => {
                  e.stopPropagation(); // prevent opening chat
                  onDeleteChat(chat.id);
                }}
                opacity={0}
                _groupHover={{ opacity: 1 }}
                transition="opacity 0.2s"
              />
            </HStack>
          ))
        ) : (
          <Box textAlign="center" p={4} color="gray.500">
            <Text>No chats yet</Text>
            <Text fontSize="sm" mt={2}>Start a new chat to begin</Text>
          </Box>
        )}
      </VStack>

      {/* Footer */}
      <Box p={4} borderTop="1px" borderColor={borderColor}>
        <Text fontSize="sm" color="gray.500" textAlign="center">
          PDF Chat App
        </Text>
      </Box>
    </Box>
  );
};

export default ChatHistory;
