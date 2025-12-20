import { View, TextInput, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';

interface BankAccountFormProps {
  bankName: string;
  onBankNameChange: (text: string) => void;
  accountNumber: string;
  onAccountNumberChange: (text: string) => void;
  ifscCode: string;
  onIfscCodeChange: (text: string) => void;
  accountHolderName: string;
  onAccountHolderNameChange: (text: string) => void;
  branchName: string;
  onBranchNameChange: (text: string) => void;
  readOnly?: boolean;
}

export default function BankAccountForm({
  bankName,
  onBankNameChange,
  accountNumber,
  onAccountNumberChange,
  ifscCode,
  onIfscCodeChange,
  accountHolderName,
  onAccountHolderNameChange,
  branchName,
  onBranchNameChange,
  readOnly = false,
}: BankAccountFormProps) {
  return (
    <View style={styles.container}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Bank Name</Text>
        <View style={[styles.inputWrapper, readOnly && styles.disabledInput]}>
          <MaterialCommunityIcons name="bank" size={20} color="#64748B" />
          <TextInput
            style={styles.input}
            placeholder="Enter bank name"
            value={bankName}
            onChangeText={onBankNameChange}
            placeholderTextColor="#94A3B8"
            editable={!readOnly}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Account Number</Text>
        <View style={[styles.inputWrapper, readOnly && styles.disabledInput]}>
          <MaterialCommunityIcons name="numeric" size={20} color="#64748B" />
          <TextInput
            style={styles.input}
            placeholder="Enter account number"
            value={accountNumber}
            onChangeText={onAccountNumberChange}
            keyboardType="numeric"
            placeholderTextColor="#94A3B8"
            editable={!readOnly}
            maxLength={18}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>IFSC Code</Text>
        <View style={[styles.inputWrapper, readOnly && styles.disabledInput]}>
          <MaterialCommunityIcons name="bank-transfer" size={20} color="#64748B" />
          <TextInput
            style={styles.input}
            placeholder="Enter IFSC code"
            value={ifscCode}
            onChangeText={(text) => onIfscCodeChange(text.toUpperCase())}
            autoCapitalize="characters"
            placeholderTextColor="#94A3B8"
            editable={!readOnly}
            maxLength={11}
          />
        </View>
        <Text style={styles.helperText}>
          Example: SBIN0001234
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Account Holder Name</Text>
        <View style={[styles.inputWrapper, readOnly && styles.disabledInput]}>
          <MaterialCommunityIcons name="account-outline" size={20} color="#64748B" />
          <TextInput
            style={styles.input}
            placeholder="Enter account holder name"
            value={accountHolderName}
            onChangeText={onAccountHolderNameChange}
            placeholderTextColor="#94A3B8"
            editable={!readOnly}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Branch Name</Text>
        <View style={[styles.inputWrapper, readOnly && styles.disabledInput]}>
          <MaterialCommunityIcons name="source-branch" size={20} color="#64748B" />
          <TextInput
            style={styles.input}
            placeholder="Enter branch name"
            value={branchName}
            onChangeText={onBranchNameChange}
            placeholderTextColor="#94A3B8"
            editable={!readOnly}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  disabledInput: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    marginLeft: 4,
  },
});
