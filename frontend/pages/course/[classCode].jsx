import React from "react";
import {
  Box,
  Collapse,
  Divider,
  Heading,
  Link as ChakraLink,
  Stack,
  Tag,
  Text,
  useMediaQuery,
  VStack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { useSearchParams } from "next/navigation";
import PageLayout from "../../components/Layout/PageLayout";
import SearchBar from "../../components/Search/SearchBar";
import { getClassInfo, getDistribution, getEveryClassCode } from "../../lib/db";
import { distributionsToCards } from "../../components/distributionsToCards";
import { useSearch } from "../../components/Search/useSearch";
import SearchResults from "../../components/Search/SearchResults";
import SRTValues from "../../components/SRTValues";

const SPECIAL_TAGS = ["Honors", "Freshman Seminar"];

const DepartmentButton = ({ deptAbbr }) => (
  <ChakraLink
    as={NextLink}
    href={`/dept/${deptAbbr}`}
    style={{
      fontWeight: "900",
    }}
  >
    {deptAbbr}
  </ChakraLink>
);

export default function Class({ classData }) {
  const {
    class_name: className,
    class_desc: classDesc,
    onestop_desc: onestopDesc,
    distributions,
    libEds,
    onestop,
    cred_min: creditMin,
    cred_max: creditMax,
    srt_vals: srtVals,
    dept_abbr: deptAbbr,
  } = classData;

  const classNumber = className.replace(deptAbbr, "");
  // put url query params into query object
  const query = useSearchParams();

  const [isMobile] = useMediaQuery("(max-width: 550px)");
  const {
    search,
    searchResults,
    pageShown: [showPage, setShowPage],
    handleChange,
  } = useSearch();

  const totalDistributions = distributionsToCards(
    [
      {
        grades: classData.total_grades,
        students: classData.total_students,
        title: "All Instructors",
        distribution_id: classData.id,
        isSummary: true,
        info: "This total also includes data from semesters with unknown instructors.",
      },
    ],
    isMobile,
    "NONE",
    !!query.get("static")
  );

  const pageLayoutProps = {
    title: `${classDesc} (${className}) | GopherGrades`,
    imageURL: `${
      process.env.NEXT_PUBLIC_VERCEL_URL
    }/api/image/class/${className.replace(" ", "")}`,
  };

  const formattedDistributions = distributions.map((dist) => ({
    ...dist,
    href: `/inst/${dist.professor_id}`,
    title: dist.professor_name,
    rating: dist.professor_RMP_score,
  }));

  if (query.get("static") === "all")
    return (
      <PageLayout {...pageLayoutProps} scriptOnly>
        {totalDistributions}
      </PageLayout>
    );
  if (query.get("static")) {
    const filtered = formattedDistributions.filter((dist) =>
      dist.title.toLowerCase().includes(query.static.toLowerCase())
    );

    return (
      <PageLayout {...pageLayoutProps} scriptOnly>
        {distributionsToCards(filtered, isMobile, "NONE", true)}
      </PageLayout>
    );
  }

  const renderedDistributions = distributionsToCards(
    formattedDistributions,
    isMobile
  );

  const libEdTags = libEds
    .sort(
      (a, b) =>
        SPECIAL_TAGS.includes(b.name) - SPECIAL_TAGS.includes(a.name) ||
        a.name.localeCompare(b.name)
    )
    .map((libEd) => (
      <Tag
        key={libEd.id}
        colorScheme={SPECIAL_TAGS.includes(libEd.name) ? "yellow" : "blue"}
        variant={"solid"}
        size={"sm"}
      >
        {libEd.name}
      </Tag>
    ));

  return (
    <PageLayout {...pageLayoutProps}>
      <Box py={8} align={"start"} width={"100%"}>
        <SearchBar placeholder={search || undefined} onChange={handleChange} />
        <SearchResults
          searchResults={searchResults}
          search={search}
          pageShown={[showPage, setShowPage]}
        />
        <Collapse
          in={showPage}
          animateOpacity
          style={{
            width: "100%",
            paddingRight: 10,
            paddingLeft: 10,
          }}
        >
          <Heading mt={4}>
            <DepartmentButton deptAbbr={deptAbbr} />
            {classNumber}: {classDesc}
          </Heading>
          <Stack direction={["column", "row"]} mt={1} spacing={2} wrap={"wrap"}>
            {creditMin !== null && (
              <Tag size={"md"}>
                {creditMin + (creditMax > creditMin ? `-${creditMax}` : "")}{" "}
                Credit{creditMax > 1 ? "s" : ""}
              </Tag>
            )}
            {libEdTags}
          </Stack>
          <Text mt={4} mb={2} fontSize={"sm"}>
            {onestopDesc}
          </Text>
          <Text mb={4} fontSize={"sm"}>
            {onestop && (
              <ChakraLink
                as={NextLink}
                href={onestop}
                isExternal
                style={{
                  opacity: 0.5,
                }}
              >
                View on University Catalog
                <ExternalLinkIcon mx={1} mb={1} />
              </ChakraLink>
            )}
          </Text>
          <VStack spacing={4} align={"start"} pb={4} minH={"50vh"}>
            {totalDistributions}
            <SRTValues srtValues={srtVals} />
            <Divider
              orientation={"horizontal"}
              style={{
                borderColor: "#49080F",
                borderBottomWidth: 1,
                opacity: 0.15,
              }}
            />
            {renderedDistributions}
          </VStack>
        </Collapse>
      </Box>
    </PageLayout>
  );
}

export async function getStaticPaths() {
  const classes = await getEveryClassCode();

  const paths = classes.map((c) => ({
    params: { classCode: c.class_name.replaceAll(" ", "") },
  }));

  return {
    paths,
    fallback: false,
  };
}
export async function getStaticProps({ params }) {
  if (!params.classCode) {
    return {
      redirect: {
        destination: `/`,
        permanent: false,
      },
    };
  }

  const { classCode } = params;

  const info = await getClassInfo(classCode);
  const distributions = await getDistribution(classCode);

  return {
    props: {
      classData: {
        ...info[0],
        distributions,
      },
    },
  };
}