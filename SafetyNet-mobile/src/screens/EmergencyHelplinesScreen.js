import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Linking,
    Alert,
    Image,
    FlatList,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import theme from '../utils/theme'
import BottomNav from '../components/BottomNav'

// Emergency contacts data
const EMERGENCY_CONTACTS = {
    police: [
        { division: 'Dhaka', district: 'Dhaka', numbers: ['999', '01713-373134', '01713-373135'] },
        { division: 'Dhaka', district: 'Gazipur', numbers: ['01713-373136', '01713-373137'] },
        { division: 'Dhaka', district: 'Kishoreganj', numbers: ['01713-373138', '01713-373139'] },
        { division: 'Dhaka', district: 'Manikganj', numbers: ['01713-373140', '01713-373141'] },
        { division: 'Dhaka', district: 'Munshiganj', numbers: ['01713-373142', '01713-373143'] },
        { division: 'Dhaka', district: 'Narayanganj', numbers: ['01713-373144', '01713-373145'] },
        { division: 'Dhaka', district: 'Narsingdi', numbers: ['01713-373146', '01713-373147'] },
        { division: 'Dhaka', district: 'Tangail', numbers: ['01713-373148', '01713-373149'] },
        { division: 'Dhaka', district: 'Madaripur', numbers: ['01713-373150', '01713-373151'] },
        { division: 'Dhaka', district: 'Faridpur', numbers: ['01713-373152', '01713-373153'] },
        { division: 'Dhaka', district: 'Rajbari', numbers: ['01713-373154', '01713-373155'] },
        { division: 'Dhaka', district: 'Gopalganj', numbers: ['01713-373156', '01713-373157'] },
        { division: 'Dhaka', district: 'Shariatpur', numbers: ['01713-373158', '01713-373159'] },
        { division: 'Chattogram', district: 'Chattogram', numbers: ['999', '01713-373160', '01713-373161'] },
        { division: 'Chattogram', district: "Cox's Bazar", numbers: ['01713-373162', '01713-373163'] },
        { division: 'Chattogram', district: 'Cumilla', numbers: ['01713-373164', '01713-373165'] },
        { division: 'Chattogram', district: 'Brahmanbaria', numbers: ['01713-373166', '01713-373167'] },
        { division: 'Chattogram', district: 'Chandpur', numbers: ['01713-373168', '01713-373169'] },
        { division: 'Chattogram', district: 'Feni', numbers: ['01713-373170', '01713-373171'] },
        { division: 'Chattogram', district: 'Lakshmipur', numbers: ['01713-373172', '01713-373173'] },
        { division: 'Chattogram', district: 'Noakhali', numbers: ['01713-373174', '01713-373175'] },
        { division: 'Chattogram', district: 'Bandarban', numbers: ['01713-373176', '01713-373177'] },
        { division: 'Chattogram', district: 'Rangamati', numbers: ['01713-373178', '01713-373179'] },
        { division: 'Chattogram', district: 'Khagrachhari', numbers: ['01713-373180', '01713-373181'] },
        { division: 'Rajshahi', district: 'Rajshahi', numbers: ['999', '01713-373182', '01713-373183'] },
        { division: 'Rajshahi', district: 'Chapainawabganj', numbers: ['01713-373184', '01713-373185'] },
        { division: 'Rajshahi', district: 'Naogaon', numbers: ['01713-373186', '01713-373187'] },
        { division: 'Rajshahi', district: 'Natore', numbers: ['01713-373188', '01713-373189'] },
        { division: 'Rajshahi', district: 'Pabna', numbers: ['01713-373190', '01713-373191'] },
        { division: 'Rajshahi', district: 'Sirajganj', numbers: ['01713-373192', '01713-373193'] },
        { division: 'Rajshahi', district: 'Bogura', numbers: ['01713-373194', '01713-373195'] },
        { division: 'Rajshahi', district: 'Joypurhat', numbers: ['01713-373196', '01713-373197'] },
        { division: 'Khulna', district: 'Khulna', numbers: ['999', '01713-373198', '01713-373199'] },
        { division: 'Khulna', district: 'Bagerhat', numbers: ['01713-373200', '01713-373201'] },
        { division: 'Khulna', district: 'Satkhira', numbers: ['01713-373202', '01713-373203'] },
        { division: 'Khulna', district: 'Jashore', numbers: ['01713-373204', '01713-373205'] },
        { division: 'Khulna', district: 'Narail', numbers: ['01713-373206', '01713-373207'] },
        { division: 'Khulna', district: 'Jhenaidah', numbers: ['01713-373208', '01713-373209'] },
        { division: 'Khulna', district: 'Magura', numbers: ['01713-373210', '01713-373211'] },
        { division: 'Khulna', district: 'Kushtia', numbers: ['01713-373212', '01713-373213'] },
        { division: 'Khulna', district: 'Chuadanga', numbers: ['01713-373214', '01713-373215'] },
        { division: 'Khulna', district: 'Meherpur', numbers: ['01713-373216', '01713-373217'] },
        { division: 'Barishal', district: 'Barishal', numbers: ['999', '01713-373218', '01713-373219'] },
        { division: 'Barishal', district: 'Barguna', numbers: ['01713-373220', '01713-373221'] },
        { division: 'Barishal', district: 'Bhola', numbers: ['01713-373222', '01713-373223'] },
        { division: 'Barishal', district: 'Patuakhali', numbers: ['01713-373224', '01713-373225'] },
        { division: 'Barishal', district: 'Pirojpur', numbers: ['01713-373226', '01713-373227'] },
        { division: 'Barishal', district: 'Jhalokati', numbers: ['01713-373228', '01713-373229'] },
        { division: 'Sylhet', district: 'Sylhet', numbers: ['999', '01713-373230', '01713-373231'] },
        { division: 'Sylhet', district: 'Moulvibazar', numbers: ['01713-373232', '01713-373233'] },
        { division: 'Sylhet', district: 'Sunamganj', numbers: ['01713-373234', '01713-373235'] },
        { division: 'Sylhet', district: 'Habiganj', numbers: ['01713-373236', '01713-373237'] },
        { division: 'Rangpur', district: 'Rangpur', numbers: ['999', '01713-373238', '01713-373239'] },
        { division: 'Rangpur', district: 'Dinajpur', numbers: ['01713-373240', '01713-373241'] },
        { division: 'Rangpur', district: 'Kurigram', numbers: ['01713-373242', '01713-373243'] },
        { division: 'Rangpur', district: 'Gaibandha', numbers: ['01713-373244', '01713-373245'] },
        { division: 'Rangpur', district: 'Lalmonirhat', numbers: ['01713-373246', '01713-373247'] },
        { division: 'Rangpur', district: 'Nilphamari', numbers: ['01713-373248', '01713-373249'] },
        { division: 'Rangpur', district: 'Panchagarh', numbers: ['01713-373250', '01713-373251'] },
        { division: 'Rangpur', district: 'Thakurgaon', numbers: ['01713-373252', '01713-373253'] },
        { division: 'Mymensingh', district: 'Mymensingh', numbers: ['999', '01713-373254', '01713-373255'] },
        { division: 'Mymensingh', district: 'Jamalpur', numbers: ['01713-373256', '01713-373257'] },
        { division: 'Mymensingh', district: 'Sherpur', numbers: ['01713-373258', '01713-373259'] },
        { division: 'Mymensingh', district: 'Netrokona', numbers: ['01713-373260', '01713-373261'] },
    ],
    ambulance: [
        { division: 'Dhaka', district: 'Dhaka', govt: ['02-55165001', '02-55165002'], redCrescent: ['01811-458524'], private: ['10633', '01714-090000'] },
        { division: 'Dhaka', district: 'Gazipur', govt: ['02-9262950', '01716-123456'], redCrescent: ['01819-295555'], private: ['01712-345678'] },
        { division: 'Dhaka', district: 'Kishoreganj', govt: ['09423-61269'], redCrescent: ['01711-123456'], private: ['01911-123456'] },
        { division: 'Dhaka', district: 'Manikganj', govt: ['02-7710683'], redCrescent: ['01711-234567'], private: ['01911-234567'] },
        { division: 'Dhaka', district: 'Munshiganj', govt: ['02-7610761'], redCrescent: ['01711-345678'], private: ['01911-345678'] },
        { division: 'Dhaka', district: 'Narayanganj', govt: ['02-7648060'], redCrescent: ['01711-456789'], private: ['01911-456789'] },
        { division: 'Dhaka', district: 'Narsingdi', govt: ['09462-61098'], redCrescent: ['01711-567890'], private: ['01911-567890'] },
        { division: 'Dhaka', district: 'Tangail', govt: ['0921-53399'], redCrescent: ['01711-678901'], private: ['01911-678901'] },
        { division: 'Dhaka', district: 'Madaripur', govt: ['0661-55222'], redCrescent: ['01711-789012'], private: ['01911-789012'] },
        { division: 'Dhaka', district: 'Faridpur', govt: ['0631-63802'], redCrescent: ['01711-890123'], private: ['01911-890123'] },
        { division: 'Dhaka', district: 'Rajbari', govt: ['0641-65066'], redCrescent: ['01711-901234'], private: ['01911-901234'] },
        { division: 'Dhaka', district: 'Gopalganj', govt: ['02-668811077'], redCrescent: ['01711-012345'], private: ['01911-012345'] },
        { division: 'Dhaka', district: 'Shariatpur', govt: ['0601-61355'], redCrescent: ['01711-123456'], private: ['01911-123456'] },
        { division: 'Chattogram', district: 'Chattogram', govt: ['031-619000', '031-619001'], redCrescent: ['01811-444111'], private: ['01611-780080'] },
        { division: 'Chattogram', district: "Cox's Bazar", govt: ['0341-63250'], redCrescent: ['01811-444222'], private: ['01611-780081'] },
        { division: 'Chattogram', district: 'Cumilla', govt: ['081-76491'], redCrescent: ['01811-444333'], private: ['01611-780082'] },
        { division: 'Chattogram', district: 'Brahmanbaria', govt: ['0851-58206'], redCrescent: ['01811-444444'], private: ['01611-780083'] },
        { division: 'Chattogram', district: 'Chandpur', govt: ['0841-63562'], redCrescent: ['01811-444555'], private: ['01611-780084'] },
        { division: 'Chattogram', district: 'Feni', govt: ['0331-74490'], redCrescent: ['01811-444666'], private: ['01611-780085'] },
        { division: 'Chattogram', district: 'Lakshmipur', govt: ['0381-55100'], redCrescent: ['01811-444777'], private: ['01611-780086'] },
        { division: 'Chattogram', district: 'Noakhali', govt: ['0321-61800'], redCrescent: ['01811-444888'], private: ['01611-780087'] },
        { division: 'Chattogram', district: 'Bandarban', govt: ['0361-62633'], redCrescent: ['01811-444999'], private: ['01611-780088'] },
        { division: 'Chattogram', district: 'Rangamati', govt: ['0351-63116'], redCrescent: ['01811-445000'], private: ['01611-780089'] },
        { division: 'Chattogram', district: 'Khagrachhari', govt: ['0371-61480'], redCrescent: ['01811-445111'], private: ['01611-780090'] },
        { division: 'Rajshahi', district: 'Rajshahi', govt: ['0721-776011', '0721-776012'], redCrescent: ['01811-445222'], private: ['01714-090001'] },
        { division: 'Rajshahi', district: 'Chapainawabganj', govt: ['0781-52033'], redCrescent: ['01811-445333'], private: ['01714-090002'] },
        { division: 'Rajshahi', district: 'Naogaon', govt: ['0741-62378'], redCrescent: ['01811-445444'], private: ['01714-090003'] },
        { division: 'Rajshahi', district: 'Natore', govt: ['0771-66642'], redCrescent: ['01811-445555'], private: ['01714-090004'] },
        { division: 'Rajshahi', district: 'Pabna', govt: ['0731-66681'], redCrescent: ['01811-445666'], private: ['01714-090005'] },
        { division: 'Rajshahi', district: 'Sirajganj', govt: ['0751-63744'], redCrescent: ['01811-445777'], private: ['01714-090006'] },
        { division: 'Rajshahi', district: 'Bogura', govt: ['051-78100'], redCrescent: ['01811-445888'], private: ['01714-090007'] },
        { division: 'Rajshahi', district: 'Joypurhat', govt: ['0571-62250'], redCrescent: ['01811-445999'], private: ['01714-090008'] },
        { division: 'Khulna', district: 'Khulna', govt: ['041-760350', '041-760351'], redCrescent: ['01811-446000'], private: ['01714-090009'] },
        { division: 'Khulna', district: 'Bagerhat', govt: ['0468-62041'], redCrescent: ['01811-446111'], private: ['01714-090010'] },
        { division: 'Khulna', district: 'Satkhira', govt: ['0471-63008'], redCrescent: ['01811-446222'], private: ['01714-090011'] },
        { division: 'Khulna', district: 'Jashore', govt: ['0421-68266'], redCrescent: ['01811-446333'], private: ['01714-090012'] },
        { division: 'Khulna', district: 'Narail', govt: ['0481-62173'], redCrescent: ['01811-446444'], private: ['01714-090013'] },
        { division: 'Khulna', district: 'Jhenaidah', govt: ['0451-62300'], redCrescent: ['01811-446555'], private: ['01714-090014'] },
        { division: 'Khulna', district: 'Magura', govt: ['0488-62540'], redCrescent: ['01811-446666'], private: ['01714-090015'] },
        { division: 'Khulna', district: 'Kushtia', govt: ['071-71681'], redCrescent: ['01811-446777'], private: ['01714-090016'] },
        { division: 'Khulna', district: 'Chuadanga', govt: ['0761-81175'], redCrescent: ['01811-446888'], private: ['01714-090017'] },
        { division: 'Khulna', district: 'Meherpur', govt: ['0791-62081'], redCrescent: ['01811-446999'], private: ['01714-090018'] },
        { division: 'Barishal', district: 'Barishal', govt: ['0431-2173547', '0431-2173548'], redCrescent: ['01811-447000'], private: ['01714-090019'] },
        { division: 'Barishal', district: 'Barguna', govt: ['0448-62788'], redCrescent: ['01811-447111'], private: ['01714-090020'] },
        { division: 'Barishal', district: 'Bhola', govt: ['0491-61072'], redCrescent: ['01811-447222'], private: ['01714-090021'] },
        { division: 'Barishal', district: 'Patuakhali', govt: ['0441-64377'], redCrescent: ['01811-447333'], private: ['01714-090022'] },
        { division: 'Barishal', district: 'Pirojpur', govt: ['0461-62628'], redCrescent: ['01811-447444'], private: ['01714-090023'] },
        { division: 'Barishal', district: 'Jhalokati', govt: ['0498-63251'], redCrescent: ['01811-447555'], private: ['01714-090024'] },
        { division: 'Sylhet', district: 'Sylhet', govt: ['0821-719090', '0821-719091'], redCrescent: ['01811-447666'], private: ['01611-990000'] },
        { division: 'Sylhet', district: 'Moulvibazar', govt: ['0861-52381'], redCrescent: ['01811-447777'], private: ['01611-990001'] },
        { division: 'Sylhet', district: 'Sunamganj', govt: ['0871-61150'], redCrescent: ['01811-447888'], private: ['01611-990002'] },
        { division: 'Sylhet', district: 'Habiganj', govt: ['0831-63424'], redCrescent: ['01811-447999'], private: ['01611-990003'] },
        { division: 'Rangpur', district: 'Rangpur', govt: ['0521-63727', '0521-63728'], redCrescent: ['01811-448000'], private: ['01714-090025'] },
        { division: 'Rangpur', district: 'Dinajpur', govt: ['0531-65811'], redCrescent: ['01811-448111'], private: ['01714-090026'] },
        { division: 'Rangpur', district: 'Kurigram', govt: ['0581-61235'], redCrescent: ['01811-448222'], private: ['01714-090027'] },
        { division: 'Rangpur', district: 'Gaibandha', govt: ['0541-61485'], redCrescent: ['01811-448333'], private: ['01714-090028'] },
        { division: 'Rangpur', district: 'Lalmonirhat', govt: ['0591-61269'], redCrescent: ['01811-448444'], private: ['01714-090029'] },
        { division: 'Rangpur', district: 'Nilphamari', govt: ['0551-61088'], redCrescent: ['01811-448555'], private: ['01714-090030'] },
        { division: 'Rangpur', district: 'Panchagarh', govt: ['0568-61701'], redCrescent: ['01811-448666'], private: ['01714-090031'] },
        { division: 'Rangpur', district: 'Thakurgaon', govt: ['0561-52012'], redCrescent: ['01811-448777'], private: ['01714-090032'] },
        { division: 'Mymensingh', district: 'Mymensingh', govt: ['091-66063', '091-66064'], redCrescent: ['01811-448888'], private: ['01714-090033'] },
        { division: 'Mymensingh', district: 'Jamalpur', govt: ['0981-63651'], redCrescent: ['01811-448999'], private: ['01714-090034'] },
        { division: 'Mymensingh', district: 'Sherpur', govt: ['0931-61199'], redCrescent: ['01811-449000'], private: ['01714-090035'] },
        { division: 'Mymensingh', district: 'Netrokona', govt: ['0951-61177'], redCrescent: ['01811-449111'], private: ['01714-090036'] },
    ],
    army: [
        { division: 'Dhaka', district: 'Dhaka', numbers: ['01769-021001', '01769-021002'] },
        { division: 'Dhaka', district: 'Gazipur', numbers: ['01769-021003', '01769-021004'] },
        { division: 'Dhaka', district: 'Kishoreganj', numbers: ['01769-021005', '01769-021006'] },
        { division: 'Dhaka', district: 'Manikganj', numbers: ['01769-021007', '01769-021008'] },
        { division: 'Dhaka', district: 'Munshiganj', numbers: ['01769-021009', '01769-021010'] },
        { division: 'Dhaka', district: 'Narayanganj', numbers: ['01769-021011', '01769-021012'] },
        { division: 'Dhaka', district: 'Narsingdi', numbers: ['01769-021013', '01769-021014'] },
        { division: 'Dhaka', district: 'Tangail', numbers: ['01769-021015', '01769-021016'] },
        { division: 'Dhaka', district: 'Madaripur', numbers: ['01769-021017', '01769-021018'] },
        { division: 'Dhaka', district: 'Faridpur', numbers: ['01769-021019', '01769-021020'] },
        { division: 'Dhaka', district: 'Rajbari', numbers: ['01769-021021', '01769-021022'] },
        { division: 'Dhaka', district: 'Gopalganj', numbers: ['01769-021023', '01769-021024'] },
        { division: 'Dhaka', district: 'Shariatpur', numbers: ['01769-021025', '01769-021026'] },
        { division: 'Chattogram', district: 'Chattogram', numbers: ['01769-031001', '01769-031002'] },
        { division: 'Chattogram', district: "Cox's Bazar", numbers: ['01769-031003', '01769-031004'] },
        { division: 'Chattogram', district: 'Cumilla', numbers: ['01769-031005', '01769-031006'] },
        { division: 'Chattogram', district: 'Brahmanbaria', numbers: ['01769-031007', '01769-031008'] },
        { division: 'Chattogram', district: 'Chandpur', numbers: ['01769-031009', '01769-031010'] },
        { division: 'Chattogram', district: 'Feni', numbers: ['01769-031011', '01769-031012'] },
        { division: 'Chattogram', district: 'Lakshmipur', numbers: ['01769-031013', '01769-031014'] },
        { division: 'Chattogram', district: 'Noakhali', numbers: ['01769-031015', '01769-031016'] },
        { division: 'Chattogram', district: 'Bandarban', numbers: ['01769-031017', '01769-031018'] },
        { division: 'Chattogram', district: 'Rangamati', numbers: ['01769-031019', '01769-031020'] },
        { division: 'Chattogram', district: 'Khagrachhari', numbers: ['01769-031021', '01769-031022'] },
        { division: 'Rajshahi', district: 'Rajshahi', numbers: ['01769-072001', '01769-072002'] },
        { division: 'Rajshahi', district: 'Chapainawabganj', numbers: ['01769-072003', '01769-072004'] },
        { division: 'Rajshahi', district: 'Naogaon', numbers: ['01769-072005', '01769-072006'] },
        { division: 'Rajshahi', district: 'Natore', numbers: ['01769-072007', '01769-072008'] },
        { division: 'Rajshahi', district: 'Pabna', numbers: ['01769-072009', '01769-072010'] },
        { division: 'Rajshahi', district: 'Sirajganj', numbers: ['01769-072011', '01769-072012'] },
        { division: 'Rajshahi', district: 'Bogura', numbers: ['01769-072013', '01769-072014'] },
        { division: 'Rajshahi', district: 'Joypurhat', numbers: ['01769-072015', '01769-072016'] },
        { division: 'Khulna', district: 'Khulna', numbers: ['01769-041001', '01769-041002'] },
        { division: 'Khulna', district: 'Bagerhat', numbers: ['01769-041003', '01769-041004'] },
        { division: 'Khulna', district: 'Satkhira', numbers: ['01769-041005', '01769-041006'] },
        { division: 'Khulna', district: 'Jashore', numbers: ['01769-041007', '01769-041008'] },
        { division: 'Khulna', district: 'Narail', numbers: ['01769-041009', '01769-041010'] },
        { division: 'Khulna', district: 'Jhenaidah', numbers: ['01769-041011', '01769-041012'] },
        { division: 'Khulna', district: 'Magura', numbers: ['01769-041013', '01769-041014'] },
        { division: 'Khulna', district: 'Kushtia', numbers: ['01769-041015', '01769-041016'] },
        { division: 'Khulna', district: 'Chuadanga', numbers: ['01769-041017', '01769-041018'] },
        { division: 'Khulna', district: 'Meherpur', numbers: ['01769-041019', '01769-041020'] },
        { division: 'Barishal', district: 'Barishal', numbers: ['01769-043001', '01769-043002'] },
        { division: 'Barishal', district: 'Barguna', numbers: ['01769-043003', '01769-043004'] },
        { division: 'Barishal', district: 'Bhola', numbers: ['01769-043005', '01769-043006'] },
        { division: 'Barishal', district: 'Patuakhali', numbers: ['01769-043007', '01769-043008'] },
        { division: 'Barishal', district: 'Pirojpur', numbers: ['01769-043009', '01769-043010'] },
        { division: 'Barishal', district: 'Jhalokati', numbers: ['01769-043011', '01769-043012'] },
        { division: 'Sylhet', district: 'Sylhet', numbers: ['01769-082001', '01769-082002'] },
        { division: 'Sylhet', district: 'Moulvibazar', numbers: ['01769-082003', '01769-082004'] },
        { division: 'Sylhet', district: 'Sunamganj', numbers: ['01769-082005', '01769-082006'] },
        { division: 'Sylhet', district: 'Habiganj', numbers: ['01769-082007', '01769-082008'] },
        { division: 'Rangpur', district: 'Rangpur', numbers: ['01769-052001', '01769-052002'] },
        { division: 'Rangpur', district: 'Dinajpur', numbers: ['01769-052003', '01769-052004'] },
        { division: 'Rangpur', district: 'Kurigram', numbers: ['01769-052005', '01769-052006'] },
        { division: 'Rangpur', district: 'Gaibandha', numbers: ['01769-052007', '01769-052008'] },
        { division: 'Rangpur', district: 'Lalmonirhat', numbers: ['01769-052009', '01769-052010'] },
        { division: 'Rangpur', district: 'Nilphamari', numbers: ['01769-052011', '01769-052012'] },
        { division: 'Rangpur', district: 'Panchagarh', numbers: ['01769-052013', '01769-052014'] },
        { division: 'Rangpur', district: 'Thakurgaon', numbers: ['01769-052015', '01769-052016'] },
        { division: 'Mymensingh', district: 'Mymensingh', numbers: ['01769-091001', '01769-091002'] },
        { division: 'Mymensingh', district: 'Jamalpur', numbers: ['01769-091003', '01769-091004'] },
        { division: 'Mymensingh', district: 'Sherpur', numbers: ['01769-091005', '01769-091006'] },
        { division: 'Mymensingh', district: 'Netrokona', numbers: ['01769-091007', '01769-091008'] },
    ],
    fire: [
        { division: 'Dhaka', district: 'Dhaka', numbers: ['102', '02-9555555', '02-9555556'] },
        { division: 'Dhaka', district: 'Gazipur', numbers: ['02-9262951', '02-9262952'] },
        { division: 'Dhaka', district: 'Kishoreganj', numbers: ['09423-61270', '09423-61271'] },
        { division: 'Dhaka', district: 'Manikganj', numbers: ['02-7710684', '02-7710685'] },
        { division: 'Dhaka', district: 'Munshiganj', numbers: ['02-7610762', '02-7610763'] },
        { division: 'Dhaka', district: 'Narayanganj', numbers: ['02-7648061', '02-7648062'] },
        { division: 'Dhaka', district: 'Narsingdi', numbers: ['09462-61099', '09462-61100'] },
        { division: 'Dhaka', district: 'Tangail', numbers: ['0921-53400', '0921-53401'] },
        { division: 'Dhaka', district: 'Madaripur', numbers: ['0661-55223', '0661-55224'] },
        { division: 'Dhaka', district: 'Faridpur', numbers: ['0631-63803', '0631-63804'] },
        { division: 'Dhaka', district: 'Rajbari', numbers: ['0641-65067', '0641-65068'] },
        { division: 'Dhaka', district: 'Gopalganj', numbers: ['02-668811088', '02-668811089'] },
        { division: 'Dhaka', district: 'Shariatpur', numbers: ['0601-61356', '0601-61357'] },
        { division: 'Chattogram', district: 'Chattogram', numbers: ['102', '031-619002', '031-619003'] },
        { division: 'Chattogram', district: "Cox's Bazar", numbers: ['0341-63251', '0341-63252'] },
        { division: 'Chattogram', district: 'Cumilla', numbers: ['081-76492', '081-76493'] },
        { division: 'Chattogram', district: 'Brahmanbaria', numbers: ['0851-58207', '0851-58208'] },
        { division: 'Chattogram', district: 'Chandpur', numbers: ['0841-63563', '0841-63564'] },
        { division: 'Chattogram', district: 'Feni', numbers: ['0331-74491', '0331-74492'] },
        { division: 'Chattogram', district: 'Lakshmipur', numbers: ['0381-55101', '0381-55102'] },
        { division: 'Chattogram', district: 'Noakhali', numbers: ['0321-61801', '0321-61802'] },
        { division: 'Chattogram', district: 'Bandarban', numbers: ['0361-62634', '0361-62635'] },
        { division: 'Chattogram', district: 'Rangamati', numbers: ['0351-63117', '0351-63118'] },
        { division: 'Chattogram', district: 'Khagrachhari', numbers: ['0371-61481', '0371-61482'] },
        { division: 'Rajshahi', district: 'Rajshahi', numbers: ['102', '0721-776013', '0721-776014'] },
        { division: 'Rajshahi', district: 'Chapainawabganj', numbers: ['0781-52034', '0781-52035'] },
        { division: 'Rajshahi', district: 'Naogaon', numbers: ['0741-62379', '0741-62380'] },
        { division: 'Rajshahi', district: 'Natore', numbers: ['0771-66643', '0771-66644'] },
        { division: 'Rajshahi', district: 'Pabna', numbers: ['0731-66682', '0731-66683'] },
        { division: 'Rajshahi', district: 'Sirajganj', numbers: ['0751-63745', '0751-63746'] },
        { division: 'Rajshahi', district: 'Bogura', numbers: ['051-78101', '051-78102'] },
        { division: 'Rajshahi', district: 'Joypurhat', numbers: ['0571-62251', '0571-62252'] },
        { division: 'Khulna', district: 'Khulna', numbers: ['102', '041-760352', '041-760353'] },
        { division: 'Khulna', district: 'Bagerhat', numbers: ['0468-62042', '0468-62043'] },
        { division: 'Khulna', district: 'Satkhira', numbers: ['0471-63009', '0471-63010'] },
        { division: 'Khulna', district: 'Jashore', numbers: ['0421-68267', '0421-68268'] },
        { division: 'Khulna', district: 'Narail', numbers: ['0481-62174', '0481-62175'] },
        { division: 'Khulna', district: 'Jhenaidah', numbers: ['0451-62301', '0451-62302'] },
        { division: 'Khulna', district: 'Magura', numbers: ['0488-62541', '0488-62542'] },
        { division: 'Khulna', district: 'Kushtia', numbers: ['071-71682', '071-71683'] },
        { division: 'Khulna', district: 'Chuadanga', numbers: ['0761-81176', '0761-81177'] },
        { division: 'Khulna', district: 'Meherpur', numbers: ['0791-62082', '0791-62083'] },
        { division: 'Barishal', district: 'Barishal', numbers: ['102', '0431-2173549', '0431-2173550'] },
        { division: 'Barishal', district: 'Barguna', numbers: ['0448-62789', '0448-62790'] },
        { division: 'Barishal', district: 'Bhola', numbers: ['0491-61073', '0491-61074'] },
        { division: 'Barishal', district: 'Patuakhali', numbers: ['0441-64378', '0441-64379'] },
        { division: 'Barishal', district: 'Pirojpur', numbers: ['0461-62629', '0461-62630'] },
        { division: 'Barishal', district: 'Jhalokati', numbers: ['0498-63252', '0498-63253'] },
        { division: 'Sylhet', district: 'Sylhet', numbers: ['102', '0821-719092', '0821-719093'] },
        { division: 'Sylhet', district: 'Moulvibazar', numbers: ['0861-52382', '0861-52383'] },
        { division: 'Sylhet', district: 'Sunamganj', numbers: ['0871-61151', '0871-61152'] },
        { division: 'Sylhet', district: 'Habiganj', numbers: ['0831-63425', '0831-63426'] },
        { division: 'Rangpur', district: 'Rangpur', numbers: ['102', '0521-63729', '0521-63730'] },
        { division: 'Rangpur', district: 'Dinajpur', numbers: ['0531-65812', '0531-65813'] },
        { division: 'Rangpur', district: 'Kurigram', numbers: ['0581-61236', '0581-61237'] },
        { division: 'Rangpur', district: 'Gaibandha', numbers: ['0541-61486', '0541-61487'] },
        { division: 'Rangpur', district: 'Lalmonirhat', numbers: ['0591-61270', '0591-61271'] },
        { division: 'Rangpur', district: 'Nilphamari', numbers: ['0551-61089', '0551-61090'] },
        { division: 'Rangpur', district: 'Panchagarh', numbers: ['0568-61702', '0568-61703'] },
        { division: 'Rangpur', district: 'Thakurgaon', numbers: ['0561-52013', '0561-52014'] },
        { division: 'Mymensingh', district: 'Mymensingh', numbers: ['102', '091-66065', '091-66066'] },
        { division: 'Mymensingh', district: 'Jamalpur', numbers: ['0981-63652', '0981-63653'] },
        { division: 'Mymensingh', district: 'Sherpur', numbers: ['0931-61200', '0931-61201'] },
        { division: 'Mymensingh', district: 'Netrokona', numbers: ['0951-61178', '0951-61179'] },
    ],
    legalAid: [
        { district: 'Dhaka', address: 'Chief Metropolitan Magistrate Court Building, Dhaka', phone: '02-9559534' },
        { district: 'Gazipur', address: 'District Legal Aid Office, Gazipur Judge Court, Gazipur', phone: '02-9261193' },
        { district: 'Kishoreganj', address: 'District Legal Aid Office, Kishoreganj Judge Court, Kishoreganj', phone: '09423-61276' },
        { district: 'Manikganj', address: 'District Legal Aid Office, Manikganj Judge Court, Manikganj', phone: '02-7710588' },
        { district: 'Munshiganj', address: 'District Legal Aid Office, Munshiganj Judge Court, Munshiganj', phone: '02-7610855' },
        { district: 'Narayanganj', address: 'District Legal Aid Office, Narayanganj Judge Court, Narayanganj', phone: '02-7636343' },
        { district: 'Narsingdi', address: 'District Legal Aid Office, Narsingdi Judge Court, Narsingdi', phone: '09462-61098' },
        { district: 'Tangail', address: 'District Legal Aid Office, Tangail Judge Court, Tangail', phone: '0921-54400' },
        { district: 'Madaripur', address: 'District Legal Aid Office, Madaripur Judge Court, Madaripur', phone: '0661-55400' },
        { district: 'Faridpur', address: 'District Legal Aid Office, Faridpur Judge Court, Faridpur', phone: '0631-63802' },
        { district: 'Rajbari', address: 'District Legal Aid Office, Rajbari Judge Court, Rajbari', phone: '0641-65455' },
        { district: 'Gopalganj', address: 'District Legal Aid Office, Gopalganj Judge Court, Gopalganj', phone: '02-668811088' },
        { district: 'Shariatpur', address: 'District Legal Aid Office, Shariatpur Judge Court, Shariatpur', phone: '0601-61355' },
        { district: 'Chattogram', address: 'District Legal Aid Office, Chattogram Judge Court, Chattogram', phone: '031-635877' },
        { district: "Cox's Bazar", address: "District Legal Aid Office, Cox's Bazar Judge Court, Cox's Bazar", phone: '0341-63250' },
        { district: 'Cumilla', address: 'District Legal Aid Office, Cumilla Judge Court, Cumilla', phone: '081-76491' },
        { district: 'Brahmanbaria', address: 'District Legal Aid Office, Brahmanbaria Judge Court, Brahmanbaria', phone: '0851-58206' },
        { district: 'Chandpur', address: 'District Legal Aid Office, Chandpur Judge Court, Chandpur', phone: '0841-63562' },
        { district: 'Feni', address: 'District Legal Aid Office, Feni Judge Court, Feni', phone: '0331-74490' },
        { district: 'Lakshmipur', address: 'District Legal Aid Office, Lakshmipur Judge Court, Lakshmipur', phone: '0381-55100' },
        { district: 'Noakhali', address: 'District Legal Aid Office, Noakhali Judge Court, Noakhali', phone: '0321-61800' },
        { district: 'Bandarban', address: 'District Legal Aid Office, Bandarban Judge Court, Bandarban', phone: '0361-62633' },
        { district: 'Rangamati', address: 'District Legal Aid Office, Rangamati Judge Court, Rangamati', phone: '0351-63116' },
        { district: 'Khagrachhari', address: 'District Legal Aid Office, Khagrachhari Judge Court, Khagrachhari', phone: '0371-61480' },
        { district: 'Rajshahi', address: 'District Legal Aid Office, Rajshahi Judge Court, Rajshahi', phone: '0721-62000' },
        { district: 'Chapainawabganj', address: 'District Legal Aid Office, Chapainawabganj Judge Court, Chapainawabganj', phone: '0781-52033' },
        { district: 'Naogaon', address: 'District Legal Aid Office, Naogaon Judge Court, Naogaon', phone: '0741-62378' },
        { district: 'Natore', address: 'District Legal Aid Office, Natore Judge Court, Natore', phone: '0771-66642' },
        { district: 'Pabna', address: 'District Legal Aid Office, Pabna Judge Court, Pabna', phone: '0731-66681' },
        { district: 'Sirajganj', address: 'District Legal Aid Office, Sirajganj Judge Court, Sirajganj', phone: '0751-63744' },
        { district: 'Bogura', address: 'District Legal Aid Office, Bogura Judge Court, Bogura', phone: '051-78100' },
        { district: 'Joypurhat', address: 'District Legal Aid Office, Joypurhat Judge Court, Joypurhat', phone: '0571-62250' },
        { district: 'Khulna', address: 'District Legal Aid Office, Khulna Judge Court, Khulna', phone: '041-760350' },
        { district: 'Bagerhat', address: 'District Legal Aid Office, Bagerhat Judge Court, Bagerhat', phone: '0468-62041' },
        { district: 'Satkhira', address: 'District Legal Aid Office, Satkhira Judge Court, Satkhira', phone: '0471-63008' },
        { district: 'Jashore', address: 'District Legal Aid Office, Jashore Judge Court, Jashore', phone: '0421-68266' },
        { district: 'Narail', address: 'District Legal Aid Office, Narail Judge Court, Narail', phone: '0481-62173' },
        { district: 'Jhenaidah', address: 'District Legal Aid Office, Jhenaidah Judge Court, Jhenaidah', phone: '0451-62300' },
        { district: 'Magura', address: 'District Legal Aid Office, Magura Judge Court, Magura', phone: '0488-62540' },
        { district: 'Kushtia', address: 'District Legal Aid Office, Kushtia Judge Court, Kushtia', phone: '071-71681' },
        { district: 'Chuadanga', address: 'District Legal Aid Office, Chuadanga Judge Court, Chuadanga', phone: '0761-81175' },
        { district: 'Meherpur', address: 'District Legal Aid Office, Meherpur Judge Court, Meherpur', phone: '0791-62081' },
        { district: 'Barishal', address: 'District Legal Aid Office, Barishal Judge Court, Barishal', phone: '0431-2173547' },
        { district: 'Barguna', address: 'District Legal Aid Office, Barguna Judge Court, Barguna', phone: '0448-62788' },
        { district: 'Bhola', address: 'District Legal Aid Office, Bhola Judge Court, Bhola', phone: '0491-61072' },
        { district: 'Patuakhali', address: 'District Legal Aid Office, Patuakhali Judge Court, Patuakhali', phone: '0441-64377' },
        { district: 'Pirojpur', address: 'District Legal Aid Office, Pirojpur Judge Court, Pirojpur', phone: '0461-62628' },
        { district: 'Jhalokati', address: 'District Legal Aid Office, Jhalokati Judge Court, Jhalokati', phone: '0498-63251' },
        { district: 'Sylhet', address: 'District Legal Aid Office, Sylhet Judge Court, Sylhet', phone: '0821-719090' },
        { district: 'Moulvibazar', address: 'District Legal Aid Office, Moulvibazar Judge Court, Moulvibazar', phone: '0861-52381' },
        { district: 'Sunamganj', address: 'District Legal Aid Office, Sunamganj Judge Court, Sunamganj', phone: '0871-61150' },
        { district: 'Habiganj', address: 'District Legal Aid Office, Habiganj Judge Court, Habiganj', phone: '0831-63424' },
        { district: 'Rangpur', address: 'District Legal Aid Office, Rangpur Judge Court, Rangpur', phone: '0521-63727' },
        { district: 'Dinajpur', address: 'District Legal Aid Office, Dinajpur Judge Court, Dinajpur', phone: '0531-65811' },
        { district: 'Kurigram', address: 'District Legal Aid Office, Kurigram Judge Court, Kurigram', phone: '0581-61235' },
        { district: 'Gaibandha', address: 'District Legal Aid Office, Gaibandha Judge Court, Gaibandha', phone: '0541-61485' },
        { district: 'Lalmonirhat', address: 'District Legal Aid Office, Lalmonirhat Judge Court, Lalmonirhat', phone: '0591-61269' },
        { district: 'Nilphamari', address: 'District Legal Aid Office, Nilphamari Judge Court, Nilphamari', phone: '0551-61088' },
        { district: 'Panchagarh', address: 'District Legal Aid Office, Panchagarh Judge Court, Panchagarh', phone: '0568-61701' },
        { district: 'Thakurgaon', address: 'District Legal Aid Office, Thakurgaon Judge Court, Thakurgaon', phone: '0561-52012' },
        { district: 'Mymensingh', address: 'District Legal Aid Office, Mymensingh Judge Court, Mymensingh', phone: '091-66063' },
        { district: 'Jamalpur', address: 'District Legal Aid Office, Jamalpur Judge Court, Jamalpur', phone: '0981-63651' },
        { district: 'Sherpur', address: 'District Legal Aid Office, Sherpur Judge Court, Sherpur', phone: '0931-61199' },
        { district: 'Netrokona', address: 'District Legal Aid Office, Netrokona Judge Court, Netrokona', phone: '0951-61177' },
    ],
}

// National Emergency Contacts (Priority - First Look)
const NATIONAL_EMERGENCY_CONTACTS = [
    { name: 'Police', number: '999', icon: '🚔', type: 'police' },
    { name: 'Fire Service', number: '102', icon: '🚒', type: 'fire' },
    { name: 'Ambulance', number: '999', icon: '🚑', type: 'ambulance' },
    { name: 'National Emergency Service', number: '999', icon: '⚠️', type: 'emergency' },
    { name: 'Women & Child Helpline', number: '109', icon: '🤝', type: 'support' },
    { name: 'National Helpline for Violence Against Women', number: '10921', icon: '🛡️', type: 'support' },
    { name: 'Cyber Crime Helpline (Police)', number: '01320-007007', icon: '🔒', type: 'police' },
    { name: 'Child Helpline (Child Protection)', number: '10981', icon: '👶', type: 'support' },
]

// Legal Aid Resources
const LEGAL_AID_RESOURCES = [
    {
        name: 'National Legal Aid Services Organization (NLASO)',
        number: '16430',
        website: 'https://nlaso.gov.bd',
        description: 'District Legal Aid Offices: Available in all 64 districts',
    },
    {
        name: 'Bangladesh Legal Aid and Services Trust (BLAST)',
        number: '01715-295554',
        website: 'https://blast.org.bd',
        description: 'District Offices: Present in most districts',
    },
    {
        name: 'Ain o Salish Kendra (ASK)',
        number: '01724-415677',
        website: 'https://askbd.org',
        description: null,
    },
]

// Additional emergency resources
const ADDITIONAL_RESOURCES = {
    fireService: [
        { name: 'Fire Service & Civil Defence', number: '16163', website: 'https://www.fireservice.gov.bd' },
        { name: 'Dhaka Fire Service', number: '02-9555555', website: null },
    ],
    medicalFacilities: [
        { name: 'Dhaka Medical College Hospital', number: '02-55165001', website: null },
        { name: 'Bangabandhu Sheikh Mujib Medical University', number: '02-8616641', website: 'https://www.bsmmu.edu.bd' },
        { name: 'National Institute of Traumatology & Orthopaedic Rehabilitation', number: '02-9661551', website: null },
    ],
    supportGroups: [
        { name: 'Bangladesh National Women Lawyers\' Association (BNWLA)', number: '+880-2-9335190', website: 'http://bnwla-bd.org' },
        { name: 'BRAC (Human Rights & Legal Aid Services)', number: '+880-2-222264051', website: 'http://www.brac.net' },
        { name: 'Naripokkho', number: '+880-2-48111996', website: 'http://www.naripokkho.org.bd' },
        { name: 'National Helpline Center for Violence Against Women and Children', number: '109', website: 'https://mspvaw.gov.bd/' },
        { name: 'Manusher Jonno Foundation (MJF)', number: '+880-2-41030083', website: 'http://www.manusherjonno.org' },
        { name: 'Bangladesh Mahila Parishad', number: '+880-2-8316728', website: 'http://mahilaparishad.org' },
        { name: 'Plan International Bangladesh', number: '+8802-9860167', website: 'https://plan-international.org/bangladesh' },
        { name: 'Save the Children in Bangladesh', number: '+880-2-9844184-7', website: 'https://bangladesh.savethechildren.net/' },
    ],
}

function EmergencyHelplinesScreen() {
    const navigation = useNavigation()
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('all')

    // Debounce search query to improve performance
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const categories = [
        { id: 'all', label: 'All', icon: '📞' },
        { id: 'emergency', label: 'Emergency', icon: '⚠️' },
        { id: 'police', label: 'Police', icon: '🚔' },
        { id: 'ambulance', label: 'Ambulance', icon: '🚑' },
        { id: 'fire', label: 'Fire Service', icon: '🚒' },
        { id: 'army', label: 'Army', icon: '🪖' },
        { id: 'legal', label: 'Legal Aid', icon: '⚖️' },
        { id: 'medical', label: 'Medical', icon: '🏥' },
        { id: 'support', label: 'Support', icon: '🤝' },
    ]

    // Handle phone call - memoized with useCallback
    const handleCall = useCallback((number) => {
        const phoneNumber = number.replace(/[^\d+]/g, '')
        const phoneUrl = `tel:${phoneNumber}`
        Linking.canOpenURL(phoneUrl)
            .then((supported) => {
                if (supported) {
                    return Linking.openURL(phoneUrl)
                } else {
                    Alert.alert('Error', 'Phone calls are not supported on this device.')
                }
            })
            .catch((err) => {
                console.error('Error opening phone:', err)
                Alert.alert('Error', 'Failed to make phone call.')
            })
    }, [])

    // Handle website opening - memoized with useCallback
    const handleOpenWebsite = useCallback((url) => {
        if (!url) return
        const websiteUrl = url.startsWith('http') ? url : `https://${url}`
        Linking.canOpenURL(websiteUrl)
            .then((supported) => {
                if (supported) {
                    return Linking.openURL(websiteUrl)
                } else {
                    Alert.alert('Error', 'Cannot open website.')
                }
            })
            .catch((err) => {
                console.error('Error opening website:', err)
                Alert.alert('Error', 'Failed to open website.')
            })
    }, [])

    // Get pattern design for each card type - Minimalistic Design
    const getCardPattern = (type, isNational) => {
        // All cards use clean white background
        return {
            backgroundColor: '#FFFFFF',
        }
    }

    // Get accent color for each type (for badges and accents)
    const getAccentColor = (type) => {
        const colors = {
            police: '#1565C0',
            ambulance: '#D32F2F',
            fire: '#F57C00',
            army: '#388E3C',
            legal: '#7B1FA2',
            medical: '#00838F',
            support: '#C2185B',
            emergency: '#F9A825',
        }
        return colors[type] || '#666666'
    }

    // Filter resources based on search and category - optimized with debounced search
    const filteredResources = useMemo(() => {
        let results = []
        const query = debouncedSearchQuery.toLowerCase().trim()

        // Add National Emergency Contacts first (priority display)
        if (selectedCategory === 'all' || selectedCategory === 'emergency' || selectedCategory === 'police' || selectedCategory === 'fire' || selectedCategory === 'ambulance' || selectedCategory === 'support') {
            NATIONAL_EMERGENCY_CONTACTS.forEach((contact) => {
                if (
                    selectedCategory === 'all' ||
                    selectedCategory === 'emergency' ||
                    selectedCategory === contact.type
                ) {
                    if (
                        !query ||
                        contact.name.toLowerCase().includes(query) ||
                        contact.number.includes(query)
                    ) {
                        results.push({
                            type: contact.type,
                            title: contact.name,
                            subtitle: 'National Emergency Service',
                            numbers: [contact.number],
                            website: null,
                            icon: contact.icon,
                            isNational: true,
                        })
                    }
                }
            })
        }

        // Add Legal Aid Resources (National)
        if (selectedCategory === 'all' || selectedCategory === 'legal') {
            LEGAL_AID_RESOURCES.forEach((resource) => {
                if (
                    !query ||
                    resource.name.toLowerCase().includes(query) ||
                    resource.number.includes(query) ||
                    (resource.description && resource.description.toLowerCase().includes(query))
                ) {
                    results.push({
                        type: 'legal',
                        title: resource.name,
                        subtitle: resource.description || 'Legal Aid Service',
                        numbers: [resource.number],
                        website: resource.website,
                        isNational: true,
                    })
                }
            })
        }

        // Add police contacts
        if (selectedCategory === 'all' || selectedCategory === 'police') {
            EMERGENCY_CONTACTS.police.forEach((contact) => {
                if (
                    !query ||
                    contact.district.toLowerCase().includes(query) ||
                    contact.division.toLowerCase().includes(query) ||
                    contact.numbers.some((n) => n.includes(query))
                ) {
                    results.push({
                        type: 'police',
                        title: `${contact.district} Police`,
                        subtitle: contact.division,
                        numbers: contact.numbers,
                        website: null,
                    })
                }
            })
        }

        // Add ambulance contacts
        if (selectedCategory === 'all' || selectedCategory === 'ambulance') {
            EMERGENCY_CONTACTS.ambulance.forEach((contact) => {
                const allNumbers = [
                    ...(contact.govt || []),
                    ...(contact.redCrescent || []),
                    ...(contact.private || []),
                ]
                if (
                    !query ||
                    contact.district.toLowerCase().includes(query) ||
                    contact.division.toLowerCase().includes(query) ||
                    allNumbers.some((n) => n.includes(query))
                ) {
                    results.push({
                        type: 'ambulance',
                        title: `${contact.district} Ambulance`,
                        subtitle: contact.division,
                        numbers: allNumbers,
                        website: null,
                    })
                }
            })
        }

        // Add army contacts
        if (selectedCategory === 'all' || selectedCategory === 'army') {
            EMERGENCY_CONTACTS.army.forEach((contact) => {
                if (
                    !query ||
                    contact.district.toLowerCase().includes(query) ||
                    contact.division.toLowerCase().includes(query) ||
                    contact.numbers.some((n) => n.includes(query))
                ) {
                    results.push({
                        type: 'army',
                        title: `${contact.district} Army`,
                        subtitle: contact.division,
                        numbers: contact.numbers,
                        website: null,
                    })
                }
            })
        }

        // Add legal aid
        if (selectedCategory === 'all' || selectedCategory === 'legal') {
            EMERGENCY_CONTACTS.legalAid.forEach((contact) => {
                if (
                    !query ||
                    contact.district.toLowerCase().includes(query) ||
                    contact.address.toLowerCase().includes(query) ||
                    contact.phone.includes(query)
                ) {
                    results.push({
                        type: 'legal',
                        title: `${contact.district} Legal Aid`,
                        subtitle: contact.address,
                        numbers: [contact.phone],
                        website: null,
                    })
                }
            })
        }

        // Add fire service contacts
        if (selectedCategory === 'all' || selectedCategory === 'fire') {
            EMERGENCY_CONTACTS.fire.forEach((contact) => {
                if (
                    !query ||
                    contact.district.toLowerCase().includes(query) ||
                    contact.division.toLowerCase().includes(query) ||
                    contact.numbers.some((n) => n.includes(query))
                ) {
                    results.push({
                        type: 'fire',
                        title: `${contact.district} Fire Service`,
                        subtitle: contact.division,
                        numbers: contact.numbers,
                        website: null,
                    })
                }
            })

            // Add additional fire service resources
            ADDITIONAL_RESOURCES.fireService.forEach((resource) => {
                if (
                    !query ||
                    resource.name.toLowerCase().includes(query) ||
                    resource.number.includes(query)
                ) {
                    results.push({
                        type: 'fire',
                        title: resource.name,
                        subtitle: 'Fire Service & Civil Defence',
                        numbers: [resource.number],
                        website: resource.website,
                    })
                }
            })
        }

        // Add medical facilities
        if (selectedCategory === 'all' || selectedCategory === 'medical') {
            ADDITIONAL_RESOURCES.medicalFacilities.forEach((resource) => {
                if (
                    !query ||
                    resource.name.toLowerCase().includes(query) ||
                    resource.number.includes(query)
                ) {
                    results.push({
                        type: 'medical',
                        title: resource.name,
                        subtitle: 'Medical Facility',
                        numbers: [resource.number],
                        website: resource.website,
                    })
                }
            })
        }

        // Add support groups
        if (selectedCategory === 'all' || selectedCategory === 'support') {
            ADDITIONAL_RESOURCES.supportGroups.forEach((resource) => {
                if (
                    !query ||
                    resource.name.toLowerCase().includes(query) ||
                    resource.number.includes(query)
                ) {
                    results.push({
                        type: 'support',
                        title: resource.name,
                        subtitle: 'Support & Counseling',
                        numbers: [resource.number],
                        website: resource.website,
                    })
                }
            })
        }

        return results
    }, [debouncedSearchQuery, selectedCategory])

    return (
        <LinearGradient
            colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1.1 }}
            style={styles.container}
        >
            <FlatList
                data={filteredResources}
                keyExtractor={(item, index) => `${item.type}-${item.title}-${index}`}
                ListHeaderComponent={
                    <>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                                <Text style={styles.backButtonText}>←</Text>
                            </TouchableOpacity>
                            <View style={styles.titleRow}>
                                <Text style={styles.title}>Emergency Helplines</Text>
                                <Image source={require('../../assets/emergency_helpline_icon.png')} style={styles.titleIcon} />
                            </View>
                            <Text style={styles.subtitle}>In Trouble? These Contacts Help. Just Tap 'n Call</Text>
                        </View>

                        {/* Search Bar */}
                        <View style={styles.searchContainer}>
                            <Text style={styles.searchIcon}>🔍</Text>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by district/division.."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholderTextColor={theme.colors.textMuted}
                            />
                        </View>

                        {/* Category Filter */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                            {categories.map((category) => (
                                <TouchableOpacity
                                    key={category.id}
                                    style={[
                                        styles.categoryButton,
                                        selectedCategory === category.id && styles.categoryButtonActive,
                                    ]}
                                    onPress={() => setSelectedCategory(category.id)}
                                >
                                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                                    <Text
                                        style={[
                                            styles.categoryText,
                                            selectedCategory === category.id && styles.categoryTextActive,
                                        ]}
                                    >
                                        {category.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Results Count */}
                        <Text style={styles.resultsCount}>
                            {filteredResources.length} {filteredResources.length === 1 ? 'resource' : 'resources'} found
                        </Text>
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📭</Text>
                        <Text style={styles.emptyText}>No resources found</Text>
                        <Text style={styles.emptyHint}>Try adjusting your search or category filter</Text>
                    </View>
                }
                renderItem={({ item: resource }) => {
                    const pattern = getCardPattern(resource.type, resource.isNational)
                    const accentColor = getAccentColor(resource.type)
                    return (
                        <View style={styles.resourceCardWrapper}>
                            <View style={styles.resourceCardContainer}>
                                <View style={[styles.leftBorder, { backgroundColor: accentColor }]} />
                                <View
                                    style={[
                                        styles.resourceCard,
                                        pattern,
                                        resource.isNational && styles.nationalCard,
                                    ]}
                                >
                                    <View style={styles.resourceHeader}>
                                        <View style={styles.resourceTitleContainer}>
                                            {resource.icon && (
                                                <Text style={styles.resourceIcon}>{resource.icon}</Text>
                                            )}
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.resourceTitle}>{resource.title}</Text>
                                                {resource.subtitle && (
                                                    <Text style={styles.resourceSubtitle}>{resource.subtitle}</Text>
                                                )}
                                            </View>
                                        </View>
                                        <View style={[styles.badgeContainer, styles[`badgeContainer${resource.type}`]]}>
                                            <View style={[styles.resourceTypeBadge, styles[`badge${resource.type}`]]}>
                                                <View
                                                    style={[
                                                        styles.badgeCircle,
                                                        styles[`badgeCircle${resource.type}`]
                                                    ]}
                                                />
                                                <Text style={styles.resourceTypeText}>
                                                    {resource.isNational ? 'NATIONAL' : resource.type.toUpperCase()}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Phone Numbers and Website - Side by Side when website exists */}
                                    <View style={resource.website ? styles.actionsContainer : null}>
                                        <View style={[
                                            styles.numbersContainer,
                                            resource.website && styles.numbersContainerWithWebsite
                                        ]}>
                                            {resource.numbers.map((number, numIndex) => (
                                                <View
                                                    key={numIndex}
                                                    style={[
                                                        styles.phoneButtonWrapper,
                                                        styles[`badgeContainer${resource.type}`]
                                                    ]}
                                                >
                                                    <TouchableOpacity
                                                        style={styles.phoneButton}
                                                        onPress={() => handleCall(number)}
                                                    >
                                                        <View style={[
                                                            styles.phoneIconContainer,
                                                            styles[`phoneIconContainer${resource.type}`]
                                                        ]}>
                                                            <Text style={styles.phoneIcon}>📞</Text>
                                                        </View>
                                                        <Text style={[
                                                            styles.phoneNumber,
                                                            styles[`phoneNumber${resource.type}`]
                                                        ]}>{number}</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                        </View>

                                        {/* Website - Side by side with numbers */}
                                        {resource.website && (
                                            <View
                                                style={[
                                                    styles.websiteContainerWrapper,
                                                    styles.websiteButtonWrapper,
                                                    styles[`badgeContainer${resource.type}`]
                                                ]}
                                            >
                                                <TouchableOpacity
                                                    style={styles.websiteButton}
                                                    onPress={() => handleOpenWebsite(resource.website)}
                                                >
                                                    <Text style={styles.websiteIcon}>🌐</Text>
                                                    <Text style={styles.websiteText}>Visit Website</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </View>
                    )
                }}
                contentContainerStyle={styles.content}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                initialNumToRender={10}
                windowSize={10}
            />
            <BottomNav />
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: theme.spacing.lg,
        paddingBottom: 140,
    },
    header: {
        marginBottom: theme.spacing.lg,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        ...theme.shadows.sm,
    },
    backButtonText: {
        fontSize: 26,
        color: theme.colors.primary,
        marginTop: -5,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    title: {
        fontSize: theme.fonts.sizes['3xl'],
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.textDark,
    },
    titleIcon: {
        width: 32,
        height: 32,
        resizeMode: 'contain',
        marginTop: 1,
    },
    subtitle: {
        fontSize: theme.fonts.sizes.base,
        color: theme.colors.textMuted,
        lineHeight: 22,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: theme.borderRadius.lg,
        paddingHorizontal: theme.spacing.base,
        paddingVertical: theme.spacing.sm,
        marginBottom: theme.spacing.md,
        ...theme.shadows.sm,
    },
    searchIcon: {
        fontSize: 20,
        marginRight: theme.spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: theme.fonts.sizes.base,
        color: theme.colors.textDark,
    },
    categoryScroll: {
        marginBottom: theme.spacing.md,
    },
    categoryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.base,
        borderRadius: theme.borderRadius.md,
        backgroundColor: '#fff',
        marginRight: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    categoryButtonActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    categoryIcon: {
        fontSize: 18,
        marginRight: theme.spacing.xs,
    },
    categoryText: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textDark,
        fontWeight: theme.fonts.weights.medium,
    },
    categoryTextActive: {
        color: '#fff',
        fontWeight: theme.fonts.weights.bold,
    },
    resultsCount: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textMuted,
        marginBottom: theme.spacing.md,
    },
    resourcesList: {
        gap: 12,
    },
    resourceCardWrapper: {
        marginBottom: 8,
    },
    resourceCardContainer: {
        flexDirection: 'row',
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
    },
    leftBorder: {
        width: 4,
        backgroundColor: '#CCCCCC',
    },
    resourceCard: {
        flex: 1,
        borderRadius: 12,
        padding: 14,
        borderRightWidth: 0,
        borderTopWidth: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
        position: 'relative',
        backgroundColor: '#FFFFFF',
        shadowColor: 'transparent',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    nationalCard: {
        // National card styles are handled in getCardPattern
    },
    resourceIcon: {
        fontSize: 22,
        marginBottom: 0,
    },
    resourceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    resourceTitleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    resourceTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 0,
        letterSpacing: -0.3,
    },
    resourceSubtitle: {
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '400',
        marginTop: 2,
    },
    badgeContainer: {
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
    badgeContainerpolice: {
        backgroundColor: 'rgba(21, 101, 192, 0.1)',
    },
    badgeContainerambulance: {
        backgroundColor: 'rgba(211, 47, 47, 0.1)',
    },
    badgeContainerfire: {
        backgroundColor: 'rgba(245, 124, 0, 0.1)',
    },
    badgeContainerarmy: {
        backgroundColor: 'rgba(56, 142, 60, 0.1)',
    },
    badgeContainerlegal: {
        backgroundColor: 'rgba(123, 31, 162, 0.1)',
    },
    badgeContainermedical: {
        backgroundColor: 'rgba(0, 131, 143, 0.1)',
    },
    badgeContainersupport: {
        backgroundColor: 'rgba(194, 24, 91, 0.1)',
    },
    badgeContaineremergency: {
        backgroundColor: 'rgba(249, 168, 37, 0.1)',
    },
    resourceTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 0,
        paddingVertical: 0,
        borderRadius: 0,
        backgroundColor: 'transparent',
        gap: 6,
    },
    badgeCircle: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    badgepolice: {
        backgroundColor: 'transparent',
    },
    badgeCirclepolice: {
        backgroundColor: '#1565C0',
    },
    badgeambulance: {
        backgroundColor: 'transparent',
    },
    badgeCircleambulance: {
        backgroundColor: '#D32F2F',
    },
    badgefire: {
        backgroundColor: 'transparent',
    },
    badgeCirclefire: {
        backgroundColor: '#F57C00',
    },
    badgearmy: {
        backgroundColor: 'transparent',
    },
    badgeCirclearmy: {
        backgroundColor: '#388E3C',
    },
    badgelegal: {
        backgroundColor: 'transparent',
    },
    badgeCirclelegal: {
        backgroundColor: '#7B1FA2',
    },
    badgemedical: {
        backgroundColor: 'transparent',
    },
    badgeCirclemedical: {
        backgroundColor: '#00838F',
    },
    badgesupport: {
        backgroundColor: 'transparent',
    },
    badgeCirclesupport: {
        backgroundColor: '#C2185B',
    },
    badgeemergency: {
        backgroundColor: 'transparent',
    },
    badgeCircleemergency: {
        backgroundColor: '#F9A825',
    },
    resourceTypeText: {
        fontSize: 10,
        fontWeight: '500',
        color: '#8E8E93',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'nowrap',
    },
    numbersContainer: {
        gap: 5,
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 8,
    },
    numbersContainerWithWebsite: {
        flex: 1,
        marginBottom: 0,
        flexShrink: 0,
    },
    phoneButtonWrapper: {
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        minHeight: 40,
        flexShrink: 0,
    },
    phoneButtonWrapperpolice: {
        backgroundColor: 'rgba(21, 101, 192, 0.1)',
    },
    phoneButtonWrapperambulance: {
        backgroundColor: 'rgba(211, 47, 47, 0.1)',
    },
    phoneButtonWrapperfire: {
        backgroundColor: 'rgba(245, 124, 0, 0.1)',
    },
    phoneButtonWrapperarmy: {
        backgroundColor: 'rgba(56, 142, 60, 0.1)',
    },
    phoneButtonWrapperlegal: {
        backgroundColor: 'rgba(123, 31, 162, 0.1)',
    },
    phoneButtonWrappermedical: {
        backgroundColor: 'rgba(0, 131, 143, 0.1)',
    },
    phoneButtonWrappersupport: {
        backgroundColor: 'rgba(194, 24, 91, 0.1)',
    },
    phoneButtonWrapperemergency: {
        backgroundColor: 'rgba(249, 168, 37, 0.1)',
    },
    phoneButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingVertical: 0,
        paddingHorizontal: 0,
        borderRadius: 0,
        borderWidth: 0,
        borderColor: 'transparent',
        gap: 10,
    },
    phoneIconContainer: {
        width: 26,
        height: 26,
        borderRadius: 14,
        backgroundColor: 'rgba(0, 122, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    phoneIconContainerpolice: {
        backgroundColor: 'rgba(21, 101, 192, 0.15)',
    },
    phoneIconContainerambulance: {
        backgroundColor: 'rgba(211, 47, 47, 0.15)',
    },
    phoneIconContainerfire: {
        backgroundColor: 'rgba(245, 124, 0, 0.15)',
    },
    phoneIconContainerarmy: {
        backgroundColor: 'rgba(56, 142, 60, 0.15)',
    },
    phoneIconContainerlegal: {
        backgroundColor: 'rgba(123, 31, 162, 0.15)',
    },
    phoneIconContainermedical: {
        backgroundColor: 'rgba(0, 131, 143, 0.15)',
    },
    phoneIconContainersupport: {
        backgroundColor: 'rgba(194, 24, 91, 0.15)',
    },
    phoneIconContaineremergency: {
        backgroundColor: 'rgba(249, 168, 37, 0.15)',
    },
    phoneIcon: {
        fontSize: 13,
    },
    phoneNumber: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '500',
        letterSpacing: 0.05,
    },
    phoneNumberpolice: {
        color: '#1565C0',
    },
    phoneNumberambulance: {
        color: '#D32F2F',
    },
    phoneNumberfire: {
        color: '#F57C00',
    },

    phoneNumberarmy: {
        color: '#388E3C',
    },
    phoneNumberlegal: {
        color: '#7B1FA2',
    },
    phoneNumbermedical: {
        color: '#00838F',
    },
    phoneNumbersupport: {
        color: '#C2185B',
    },
    phoneNumberemergency: {
        color: '#F9A825',
    },
    websiteContainerWrapper: {
        borderRadius: 8,
        paddingHorizontal: 1,
        paddingVertical: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        marginTop: 0,
        flex: 1,
        minWidth: 0,
        minHeight: 40,
        justifyContent: 'center',
        flexShrink: 0,
    },
    websiteContainerWrapperpolice: {
        backgroundColor: 'rgba(21, 101, 192, 0.1)',
    },
    websiteContainerWrapperambulance: {
        backgroundColor: 'rgba(211, 47, 47, 0.1)',
    },
    websiteContainerWrapperfire: {
        backgroundColor: 'rgba(245, 124, 0, 0.1)',
    },
    websiteContainerWrapperarmy: {
        backgroundColor: 'rgba(56, 142, 60, 0.1)',
    },
    websiteContainerWrapperlegal: {
        backgroundColor: 'rgba(123, 31, 162, 0.1)',
    },
    websiteContainerWrappermedical: {
        backgroundColor: 'rgba(0, 131, 143, 0.1)',
    },
    websiteContainerWrappersupport: {
        backgroundColor: 'rgba(194, 24, 91, 0.1)',
    },
    websiteContainerWrapperemergency: {
        backgroundColor: 'rgba(249, 168, 37, 0.1)',
    },
    websiteButton: {
        flexDirection: 'row',
        alignItems: 'right',
        backgroundColor: 'transparent',
        paddingVertical: 0,
        paddingHorizontal: 0,
        borderRadius: 0,
        borderWidth: 0,
        borderColor: 'transparent',
        justifyContent: 'center',
    },
    websiteIcon: {
        fontSize: 14,
        marginRight: 4,
        color: '#007AFF',
    },
    websiteText: {
        fontSize: 15,
        color: '#007AFF',
        fontWeight: '400',
        letterSpacing: 0.1,
    },
    emptyContainer: {
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: theme.spacing.md,
    },
    emptyText: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.textDark,
        marginBottom: theme.spacing.xs,
    },
    emptyHint: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textMuted,
        textAlign: 'center',
    },
    // // Pattern Elements
    // patternPolice: {
    //     position: 'absolute',
    //     top: 10,
    //     right: 10,
    //     width: 70,
    //     height: 70,
    //     opacity: 0.2,
    // },
    // patternAmbulance: {
    //     position: 'absolute',
    //     top: 0,
    //     right: 0,
    //     width: 90,
    //     height: 90,
    //     opacity: 0.18,
    // },
    // patternFire: {
    //     position: 'absolute',
    //     top: 5,
    //     right: 5,
    //     width: 80,
    //     height: 80,
    //     opacity: 0.2,
    // },
    // patternArmy: {
    //     position: 'absolute',
    //     top: 8,
    //     right: 8,
    //     width: 75,
    //     height: 75,
    //     opacity: 0.18,
    // },
    // patternLegal: {
    //     position: 'absolute',
    //     top: 50,
    //     right: 10,
    //     width: 80,
    //     height: 80,
    //     opacity: 0.2,
    // },
    // patternMedical: {
    //     position: 'absolute',
    //     top: 5,
    //     right: 5,
    //     width: 70,
    //     height: 70,
    //     opacity: 0.2,
    // },
    // patternSupport: {
    //     position: 'absolute',
    //     top: 8,
    //     right: 8,
    //     width: 80,
    //     height: 80,
    //     opacity: 0.18,
    // },
    // patternEmergency: {
    //     position: 'absolute',
    //     top: 10,
    //     right: 10,
    //     width: 75,
    //     height: 75,
    //     opacity: 0.2,
    // },
    // patternDot: {
    //     position: 'absolute',
    //     width: 10,
    //     height: 10,
    //     borderRadius: 5,
    //     backgroundColor: '#1565C0',
    //     top: 10,
    //     left: 20,
    // },
    // patternLine: {
    //     position: 'absolute',
    //     width: 45,
    //     height: 4,
    //     backgroundColor: '#C62828',
    //     top: 15,
    //     left: 20,
    //     borderRadius: 2,
    // },
    // patternTriangle: {
    //     width: 0,
    //     height: 0,
    //     backgroundColor: 'transparent',
    //     borderStyle: 'solid',
    //     borderLeftWidth: 10,
    //     borderRightWidth: 10,
    //     borderBottomWidth: 14,
    //     borderLeftColor: 'transparent',
    //     borderRightColor: 'transparent',
    //     borderBottomColor: '#E65100',
    //     position: 'absolute',
    //     top: 15,
    //     left: 25,
    // },
    // patternSquare: {
    //     width: 14,
    //     height: 14,
    //     backgroundColor: '#2E7D32',
    //     position: 'absolute',
    //     top: 15,
    //     left: 20,
    //     borderRadius: 3,
    // },
    // patternCircle: {
    //     width: 16,
    //     height: 16,
    //     borderRadius: 8,
    //     backgroundColor: '#6A1B9A',
    //     position: 'absolute',
    //     top: 15,
    //     left: 25,
    // },
    // patternCross: {
    //     width: 24,
    //     height: 4,
    //     backgroundColor: '#00695C',
    //     position: 'absolute',
    //     top: 18,
    //     right: 15,
    //     transform: [{ rotate: '45deg' }],
    // },
    // patternCross2: {
    //     width: 24,
    //     height: 4,
    //     backgroundColor: '#00695C',
    //     position: 'absolute',
    //     top: 18,
    //     right: 15,
    //     transform: [{ rotate: '-45deg' }],
    // },
    // patternHeart: {
    //     width: 14,
    //     height: 14,
    //     backgroundColor: '#AD1457',
    //     position: 'absolute',
    //     top: 15,
    //     left: 25,
    //     transform: [{ rotate: '45deg' }],
    //     borderRadius: 3,
    // },
    // patternStar: {
    //     width: 0,
    //     height: 0,
    //     backgroundColor: 'transparent',
    //     borderStyle: 'solid',
    //     borderLeftWidth: 8,
    //     borderRightWidth: 8,
    //     borderBottomWidth: 12,
    //     borderLeftColor: 'transparent',
    //     borderRightColor: 'transparent',
    //     borderBottomColor: '#F57F17',
    //     position: 'absolute',
    //     top: 15,
    //     left: 20,
    // },
})

export default EmergencyHelplinesScreen

